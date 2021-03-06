import "obsidian";
declare module "obsidian" {
  interface App {
    plugins: {
      enablePlugin(id: string): Promise<void>;
      disablePlugin(id: string): Promise<void>;
    };
  }
  interface FileManager {
    createNewMarkdownFileFromLinktext(
      linktext: string,
      sourcePath: string,
    ): TFile;
  }
  interface MetadataCache {
    on(name: "finished", callback: () => any, ctx?: any): EventRef;
    initialized: boolean;
  }

  interface EditorSuggest<T> {
    suggestEl: HTMLElement;
  }

  interface SuggestModal<T> {
    updateSuggestions(): void;
  }
}
