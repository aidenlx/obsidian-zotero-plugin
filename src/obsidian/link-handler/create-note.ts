import { RegularItem } from "@zt-types";
import { AnnotationItem } from "@zt-types";
import { BaseError } from "make-error";
import { TFile } from "obsidian";
import { posix as path } from "path";

import { getItemKeyGroupID } from "../note-index/index";
import { ItemWithAnnos, ZOTERO_KEY_FIELDNAME } from "../note-template/const";
import ZoteroPlugin from "../zt-main";

export class NoteExistsError extends BaseError {
  constructor(public target: string, public key: string) {
    super(`Note linked to ${key} already exists: ${target}`);
    this.name = "NoteExistsError";
  }
}

const createNote = async (
  plugin: ZoteroPlugin,
  info: RegularItem,
  annots?: AnnotationItem[],
): Promise<TFile> => {
  const { vault, fileManager, metadataCache: meta } = plugin.app,
    { literatureNoteFolder: folder, literatureNoteTemplate: template } =
      plugin.settings;

  const filepath = path.join(folder.path, template.render("filename", info));
  let existingFile = vault.getAbstractFileByPath(filepath);
  if (existingFile) {
    let metadata = meta.getCache(existingFile.path);
    if (
      metadata?.frontmatter &&
      metadata.frontmatter[ZOTERO_KEY_FIELDNAME] === getItemKeyGroupID(info)
    ) {
      // only throw error if the note is linked to the same zotero item
      throw new NoteExistsError(filepath, info.key);
    }
  }
  let infoWithAnnos = info as ItemWithAnnos;
  if (annots) infoWithAnnos.annotations = annots;
  const note = await fileManager.createNewMarkdownFileFromLinktext(
    filepath,
    "",
  );
  await vault.modify(note, template.render("content", infoWithAnnos));
  return note;
};

export default createNote;
