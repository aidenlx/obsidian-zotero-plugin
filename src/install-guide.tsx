/** @jsx el */

import { fileDialog } from "file-select-dialog";
import { statSync } from "fs";
import type { App } from "obsidian";
import { Modal, Notice } from "obsidian";
import { join } from "path";

import { getConfigDirFunc, libName } from "./const";

const PLUGIN_ID = "obsidian-zotero-plugin";

const { arch, platform } = process;

const PlatformSupported = [
  ["darwin", "arm64"],
  ["darwin", "x64"],
  ["linux", "x64"],
  ["win32", "x64"],
  ["win32", "ia32"],
] as [platform: string, arch: string][];
const showInstallGuide = () => {
  // if platform is supported
  if (PlatformSupported.some(([p, a]) => arch === a && platform === p)) {
    const LibPath = join(getConfigDirFunc(), libName);
    try {
      if (!statSync(LibPath).isFile()) {
        new Notice(
          `Path to database library occupied, please check the location manually: ` +
            join(getConfigDirFunc(), libName),
          2e3,
        );
      }
    } catch (e) {
      const error = e as NodeJS.ErrnoException;
      if (error.code === "ENOENT") {
        // if library file does not exist
        new GoToDownloadModal().open();
      } else {
        new Notice(error.toString());
      }
    }
  } else {
    new Notice(
      `Your device (${arch}-${platform}) is not supported by obsidian-zotero-plugin`,
    );
  }
};
export default showInstallGuide;

export const checkLib = () => {
  try {
    require(join(getConfigDirFunc(), libName));
  } catch (err) {
    (err as NodeJS.ErrnoException).code === "MODULE_NOT_FOUND" &&
      showInstallGuide();
    throw err;
  }
};

import { el, mount, unmount } from "redom";
declare global {
  namespace JSX {
    export interface IntrinsicElements {
      [elemName: string]: any;
    }
    // export type ElementClass = RedomComponent;
    //export type Element = RedomElement | HTMLElement
  }
}
const colorSuccess = "var(--background-modifier-success)",
  colorDisabled = "var(--background-modifier-cover)";
const getGuideContent = ({
  selectBtn,
  reloadBtn,
}: {
  selectBtn: HTMLButtonElement;
  reloadBtn: HTMLButtonElement;
}): HTMLElement => {
  const downloadLink = `https://github.com/aidenlx/obsidian-zotero-plugin/blob/master/assets/better-sqlite3/${platform}-${arch}.zip?raw=true`,
    moduleFilename = <code>{libName}</code>;
  return (
    <div>
      <h1>Install better-sqlite3</h1>
      <div>
        Obsidian Zotero Plugin requires node-sqlite3 to be installed. Follow the
        instructions below to install it.
      </div>
      <ol>
        <li>
          Download zip file from <a href={downloadLink}>GitHub</a>.
        </li>
        <li>Extract the zip file to get {moduleFilename} file</li>
        <li>
          Click the button to select {moduleFilename}: {selectBtn}
        </li>
        <li>Click the button to reload Obsidian Zotero Plugin: {reloadBtn}</li>
      </ol>
    </div>
  );
};

declare global {
  const app: App & { openWithDefaultApp(path: string): void };
}

class GoToDownloadModal extends Modal {
  selectBtn: HTMLButtonElement;
  reloadBtn: HTMLButtonElement;
  jsx: HTMLElement;

  constructor() {
    super(app);
    this.modalEl.addClass("zt-install-guide");
    this.selectBtn = (
      <button onclick={this.onSelectingFile.bind(this)}>Select</button>
    );
    this.reloadBtn = (
      <button disabled onclick={this.onReloadPlugin.bind(this)}>
        Reload Plugin
      </button>
    );
    this.reloadBtn.style.backgroundColor = colorDisabled;
    this.jsx = getGuideContent(this);
  }
  onOpen() {
    mount(this.contentEl, this.jsx);
  }
  onClose() {
    unmount(this.contentEl, this.jsx);
    this.contentEl.empty();
  }

  async onSelectingFile() {
    const file = await fileDialog({
      multiple: false,
      accept: ".node",
      strict: true,
    });
    if (!file) return;
    await this.app.vault.adapter.writeBinary(
      this.app.vault.configDir + "/" + libName,
      await file.arrayBuffer(),
    );
    if (this.selectBtn) {
      this.selectBtn.setText("Library file imported");
      this.selectBtn.style.backgroundColor = colorSuccess;
    }
    if (this.reloadBtn) {
      this.reloadBtn.disabled = false;
      this.reloadBtn.style.backgroundColor = "";
    }
  }
  async onReloadPlugin() {
    await this.app.plugins.disablePlugin(PLUGIN_ID);
    this.close();
    await this.app.plugins.enablePlugin(PLUGIN_ID);
  }
}