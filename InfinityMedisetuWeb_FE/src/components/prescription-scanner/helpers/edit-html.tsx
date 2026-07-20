import { Editor } from "@tinymce/tinymce-react";
import { useEffect, useRef, useState } from "react";
import { Editor as TinyMCEEditor } from "tinymce";

interface HTMLEditorProps {
  id?: string;
  initialValue?: string;
  extraContentStyle?: string;
  onChange?: (html: string) => void;
}

export function HTMLEditor({
  id,
  initialValue,
  extraContentStyle,
  onChange,
}: HTMLEditorProps) {
  const [mounted, setMounted] = useState(false);
  const [scriptLoadError, setScriptLoadError] = useState<string>("");
  const editorRef = useRef<TinyMCEEditor | null>(null);

  const resolvedInitialValue =
    initialValue ?? "<p>Use AI to generate your HTML template</p>";
  
  // Make sure it loads from the correct Vite base URL
  const scriptPath = `${window.location.origin}/app/tinymce/tinymce.min.js`;

  useEffect(() => {
    // Defeat React StrictMode double-invoke
    const timer = window.setTimeout(() => setMounted(true), 10);
    return () => window.clearTimeout(timer);
  }, []);

  const filePickerCallback = (
    callback: (value: string, meta?: Record<string, string>) => void,
    _value: string,
    meta: { filetype?: string },
  ) => {
    if (meta.filetype === "image") {
      const input = document.createElement("input");

      input.type = "file";
      input.accept = "image/*";

      input.onchange = async (event: Event) => {
        const file = (event.target as HTMLInputElement).files?.[0];

        if (!file) return;

        const formData = new FormData();

        formData.append("file", file);
        formData.append(
          "upload_preset",
          import.meta.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "",
        );

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${import.meta.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
          { method: "POST", body: formData },
        );

        const data = await res.json();

        callback(data.secure_url, {
          alt: file.name,
          title: file.name,
        });
      };

      input.click();
    }
  };

  const useDarkMode =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (!mounted) {
    return <div className="min-h-[400px] rounded-large border border-default-200" />;
  }

  if (scriptLoadError) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-warning-100 p-4 text-warning-800 text-sm">
          <strong>Failed to load rich text editor.</strong><br />
          Make sure TinyMCE assets exist at: <code>{scriptPath}</code><br />
          Details: {scriptLoadError}
        </div>
        <textarea
          className="min-h-[420px] w-full rounded-large border border-default-300 bg-content1 p-3 font-mono text-sm"
          defaultValue={resolvedInitialValue}
          onChange={(event) => onChange?.(event.target.value)}
        />
      </div>
    );
  }

  return (
    <Editor
      id={id}
      init={{
        base_url: `${window.location.origin}/app/tinymce`,
        suffix: ".min",
        
        /* ---------------- CORE ---------------- */
        menubar: false,
        branding: false,
        promotion: false,

        plugins:
          "autoresize preview importcss searchreplace autolink autosave " +
          "directionality fullscreen image link table lists wordcount " +
          "quickbars emoticons",

        toolbar:
          "undo redo | blocks fontfamily fontsize | " +
          "bold italic underline | alignleft aligncenter alignright | " +
          "numlist bullist | link image | table | " +
          "forecolor backcolor removeformat",

        /* ---------------- SECURITY ---------------- */

        // Protect template syntax completely
        protect: [/\{\{[\s\S]*?\}\}/g, /\{\{\{[\s\S]*?\}\}\}/g],

        // Lock variables
        noneditable_class: "mceNonEditable",

        // Regex fallback protection
        noneditable_regexp: /\{\{[\s\S]*?\}\}/g,

        // Ensure formatting works around variables
        format_noneditable_selector: "span.mceNonEditable",

        /* ---------------- HTML CONTROL ---------------- */

        valid_elements: `
                        div[*],
                        span[*],
                        p[*],
                        b,strong,i,em,
                        ul,ol,li,
                        table,tr,td,th,
                        img[src|alt|title|width|height|style|class],
                        a[href|target|title],
                        br
                      `,

        invalid_elements: "script,iframe,object,embed",

        forced_root_block: "div",
        inline_styles: true,
        verify_html: false,
        remove_empty_elements: false,
        image_dimensions: false,
        automatic_uploads: true,

        /* ---------------- PASTE CONTROL ---------------- */

        paste_as_text: false,
        paste_data_images: false,
        paste_webkit_styles: "all",

        /* ---------------- UX ---------------- */

        min_height: 400,
        max_height: 1000,
        autoresize_bottom_margin: 100,

        file_picker_callback: filePickerCallback,

        quickbars_selection_toolbar: "bold italic | quicklink",

        contextmenu: "link image table",

        toolbar_mode: "wrap",

        skin: useDarkMode ? "oxide-dark" : "oxide",
        content_css: useDarkMode ? "dark" : "default",

        content_style: `
          body { font-family: Helvetica, Arial, sans-serif; font-size: 16px; }
          .mceNonEditable { 
            background: rgba(0,0,0,0.04); 
            border-radius: 3px;
            padding: 1px 2px;
          }
          .hb-block-marker {
            display: none !important;
            padding: 0 !important;
            background: transparent !important;
          }
          ${extraContentStyle ?? ""}
        `,

        /* ---------------- HARD PROTECTION ---------------- */

        setup: (editor: TinyMCEEditor) => {
          editor.on("keydown", (e: KeyboardEvent) => {
            const dom = editor.dom;
            const selection = editor.selection;

            if (!selection) return;

            const node = selection.getNode();

            if (
              dom.getParent(node, ".mceNonEditable") ||
              dom.hasClass(node, "mceNonEditable")
            ) {
              e.preventDefault();
            }
          });
        },
      }}
      initialValue={resolvedInitialValue}
      licenseKey="gpl"
      tinymceScriptSrc={scriptPath}
      onScriptsLoadError={(err) => {
        console.error("TinyMCE load error:", err);
        setScriptLoadError(String(err) || "Unknown error loading script.");
      }}
      onEditorChange={(val) => onChange?.(val)}
      onInit={(_, editor) => {
        editorRef.current = editor;
      }}
    />
  );
}
