// global.d.ts
declare module "@ckeditor/ckeditor5-build-classic" {
  import { Editor } from "@ckeditor/ckeditor5-core";
  import { EditorWatchdog } from "@ckeditor/ckeditor5-watchdog";
  import { ContextWatchdog } from "@ckeditor/ckeditor5-watchdog";

  const ClassicEditor: {
    create(...args: any[]): Promise<Editor>;
    EditorWatchdog: typeof EditorWatchdog;
    ContextWatchdog: typeof ContextWatchdog;
  };

  export = ClassicEditor;
}
