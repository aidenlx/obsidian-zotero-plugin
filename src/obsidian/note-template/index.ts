import type { RegularItem } from "@zt-types";
import assertNever from "assert-never";
import { stringify } from "gray-matter";
import Handlebars from "handlebars";

import { getItemKeyGroupID } from "../note-index/index";
import {
  DEFAULT_FRONTMATTER_FIELD,
  DEFAULT_TEMPLATE,
  FieldsInFrontmatter,
  NoteTemplateJSON,
  TemplateInstances,
  TemplateItemTypeMap,
  ZOTERO_KEY_FIELDNAME,
} from "./const";
import { Helpers, Partial } from "./helper";

const CompileOptions: Parameters<typeof Handlebars.compile>[1] = {
    noEscape: true,
  },
  grayMatterOptions = {};

const EmptyTemplateInstances: Record<keyof TemplateInstances, null> = {
  content: null,
  filename: null,
  annotation: null,
  annots: null,
  mdCite: null,
  altMdCite: null,
};

export default class NoteTemplate {
  private templateInstances: TemplateInstances = {
    ...EmptyTemplateInstances,
  } as any;
  getAllTemplatePropNames(): (keyof TemplateItemTypeMap)[] {
    return Object.keys(this.templateInstances) as any;
  }
  private compile(name: keyof NoteTemplateJSON, template: string) {
    const tpl = Handlebars.compile(template, CompileOptions);
    this.templateInstances[name] = tpl as any;
    if (name === "annotation" || name === "annots")
      Handlebars.registerPartial(name, tpl);
  }
  public complieAll(): void {
    for (const key of this.getAllTemplatePropNames()) {
      this.compile(key, this[key]);
    }
  }
  constructor() {
    Object.assign(this, DEFAULT_TEMPLATE);
    this.frontmatter = { ...DEFAULT_FRONTMATTER_FIELD };
    Handlebars.registerPartial(Partial as any);
    Handlebars.registerHelper(Helpers);
    this.complieAll();
  }

  public render<Target extends keyof NoteTemplateJSON>(
    target: Target,
    obj: TemplateItemTypeMap[Target],
  ): string {
    const renderWith = (obj: any) => this.templateInstances[target](obj);
    if (target === "content") {
      const content = renderWith(obj);
      const frontmatterData = this.renderFrontmatter(
        obj as TemplateItemTypeMap["content"],
      );
      if (frontmatterData)
        return stringify(content, frontmatterData, grayMatterOptions);
    } else if (target === "annots") {
      return renderWith({ annotations: obj });
    }
    return renderWith(obj);
  }

  private renderFrontmatter<T extends RegularItem>(target: T) {
    let data: Record<string, any> = {};
    let notEmpty = false;
    // zotero-key required
    data[ZOTERO_KEY_FIELDNAME] = getItemKeyGroupID(target);
    for (const [k, config] of Object.entries<string[] | true>(
      this.frontmatter,
    )) {
      if (!(k in target)) continue;
      const value = target[k as keyof T];
      if (config === true) {
        data[k] = value;
      } else if (Array.isArray(config)) {
        // map value to an alias name
        new Set(config).forEach((alias) => (data[alias] = value));
      } else {
        assertNever(config);
      }
      notEmpty = true;
    }
    return notEmpty ? data : null;
  }

  //#region default templates
  // zotero-key is an required field
  frontmatter: FieldsInFrontmatter;
  private filename!: string;
  private content!: string;
  private annots!: string;
  private annotation!: string;
  private mdCite!: string;
  private altMdCite!: string;
  //#endregion

  //#region define properties
  public setTemplateField(name: keyof NoteTemplateJSON, template: string) {
    if (template !== this[name]) {
      this.compile(name, template);
      this[name] = template;
    }
  }
  public getTemplateField(name: keyof NoteTemplateJSON) {
    return this[name];
  }
  //#endregion

  toJSON(): NoteTemplateJSON {
    return {
      content: this.content,
      filename: this.filename,
      annotation: this.annotation,
      annots: this.annots,
      mdCite: this.mdCite,
      altMdCite: this.altMdCite,
    };
  }
  updateFromJSON(json: NoteTemplateJSON | undefined): this {
    if (json) {
      Object.assign(this, json, {
        // additional fields need to be manually converted
      });
    }
    this.complieAll();
    return this;
  }
}
