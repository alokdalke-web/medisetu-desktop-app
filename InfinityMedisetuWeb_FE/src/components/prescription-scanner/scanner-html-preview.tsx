import type { PrescriptionData } from "../../types/prescription-scanner";

import { Button } from "@heroui/button";
import Handlebars from "handlebars";
import { useEffect, useMemo, useState } from "react";

import { HTMLEditor } from "../../components/prescription-scanner/helpers/edit-html";
import { useGetDoctorQuery } from "../../redux/api/doctorApi";
import { useUpdateDoctorPrescriptionTemplateMutation } from "../../redux/api/doctorPrescriptionTemplateApi";

type ViewMode = "preview" | "edit";

type ScannerHtmlPreviewProps = {
  templateHtml: string;
  data?: PrescriptionData;
  onTemplateChange?: (nextTemplate: string) => void;
  onSaveSuccess?: (savedTemplate?: string) => void;
};

type GetDoctorResponse = {
  result?: {
    doctorProfile?: {
      id?: string;
    };
  };
};

/* -----------------------------
   STYLE HELPERS
------------------------------ */

function extractStyleBlocks(html: string): string[] {
  const matches = html.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi);
  return matches ?? [];
}

function extractEditorCss(html: string): string {
  const styleBlocks = extractStyleBlocks(html);

  if (styleBlocks.length === 0) return "";

  return styleBlocks
    .map((block) => block.replace(/<style\b[^>]*>|<\/style>/gi, ""))
    .join("\n\n");
}

function preserveTemplateStyles(previousHtml: string, nextHtml: string): string {
  const previousStyleBlocks = extractStyleBlocks(previousHtml);

  if (previousStyleBlocks.length === 0) return nextHtml;
  if (extractStyleBlocks(nextHtml).length > 0) return nextHtml;

  const mergedStyles = `${previousStyleBlocks.join("\n")}\n`;

  if (/<\/head>/i.test(nextHtml)) {
    return nextHtml.replace(/<\/head>/i, `${mergedStyles}</head>`);
  }

  if (/<html\b[^>]*>/i.test(nextHtml)) {
    return nextHtml.replace(
      /<html\b[^>]*>/i,
      (match) => `${match}<head>${mergedStyles}</head>`,
    );
  }

  return `${mergedStyles}${nextHtml}`;
}

function sanitizeBrokenMarkerArtifacts(html: string): string {
  return html
    .replace(/\r/g, "")
    .replace(/<span[^>]*data-hb-block-(?:start|end)="[^"]+"[^>]*><\/span>/g, "")
    .replace(/class="mceNonEditable hb-block-marker">/g, "");
}

/* -----------------------------
   DATA INJECTION
------------------------------ */

function injectTemplateData(template: string, data?: PrescriptionData): string {
  if (!data) return template;

  try {
    const compiled = Handlebars.compile(template, { strict: false });
    return compiled(data);
  } catch {
    return template;
  }
}

/* -----------------------------
   EDITOR VARIABLE BRIDGE
------------------------------ */

type VariableBinding = {
  expression: string;
  value: string;
};

function extractVariableExpressions(template: string): string[] {
  const matches =
    template.match(/\{\{\{?\s*([a-zA-Z0-9_.[\]]+)\s*\}?\}\}/g) ?? [];
  const unique = new Set<string>();

  for (const raw of matches) {
    const expr = raw.replace(/^\{\{\{?\s*|\s*\}?\}\}$/g, "").trim();

    if (!expr) continue;
    if (expr.startsWith("#") || expr.startsWith("/") || expr === "else") continue;

    unique.add(expr);
  }

  return Array.from(unique);
}

function getValue(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;

  return path.split(".").reduce<unknown>((acc, key) => {
    if (
      acc &&
      typeof acc === "object" &&
      key in (acc as Record<string, unknown>)
    ) {
      return (acc as Record<string, unknown>)[key];
    }

    return undefined;
  }, obj);
}

function createVariableBindings(
  template: string,
  data?: PrescriptionData,
): VariableBinding[] {
  if (!data) return [];

  const bindings = extractVariableExpressions(template)
    .map((expression) => {
      const value = getValue(data, expression);

      if (value === undefined || value === null) return null;

      const asString = String(value);

      if (!asString.trim()) return null;

      return { expression, value: asString };
    })
    .filter((item): item is VariableBinding => Boolean(item));

  return bindings.sort((a, b) => b.value.length - a.value.length);
}

function hasFullHtmlDocument(html: string): boolean {
  return /<html\b[^>]*>/i.test(html);
}

function serializeHtmlDocument(document: Document, originalHtml: string): string {
  const doctypeMatch = originalHtml.match(/<!doctype[^>]*>/i);
  const doctypePrefix = doctypeMatch ? `${doctypeMatch[0]}\n` : "";

  return `${doctypePrefix}${document.documentElement.outerHTML}`;
}

function createHtmlRoot(html: string): {
  root: ParentNode;
  serialize: () => string;
} {
  if (hasFullHtmlDocument(html)) {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(html, "text/html");

    return {
      root: parsed.documentElement,
      serialize: () => serializeHtmlDocument(parsed, html),
    };
  }

  const container = document.createElement("div");
  container.innerHTML = html;

  return {
    root: container,
    serialize: () => container.innerHTML,
  };
}

function preserveTemplateDocumentShell(
  previousHtml: string,
  nextHtml: string,
): string {
  if (typeof window === "undefined") return nextHtml;
  if (!hasFullHtmlDocument(previousHtml)) return nextHtml;

  if (hasFullHtmlDocument(nextHtml)) {
    const previousDoctype = previousHtml.match(/<!doctype[^>]*>/i)?.[0] ?? "";
    const nextHasDoctype = /<!doctype[^>]*>/i.test(nextHtml);

    if (previousDoctype && !nextHasDoctype) {
      return `${previousDoctype}\n${nextHtml}`;
    }

    return nextHtml;
  }

  const parser = new DOMParser();
  const previousDoc = parser.parseFromString(previousHtml, "text/html");

  previousDoc.body.innerHTML = nextHtml;

  return serializeHtmlDocument(previousDoc, previousHtml);
}

function protectInjectedValues(
  injectedHtml: string,
  template: string,
  data?: PrescriptionData,
): string {
  if (typeof window === "undefined") return injectedHtml;

  const bindings = createVariableBindings(template, data);

  if (bindings.length === 0) return injectedHtml;

  const htmlRoot = createHtmlRoot(injectedHtml);
  const walker = document.createTreeWalker(htmlRoot.root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  let currentNode = walker.nextNode();

  while (currentNode) {
    textNodes.push(currentNode as Text);
    currentNode = walker.nextNode();
  }

  for (const textNode of textNodes) {
    const parent = textNode.parentElement;

    if (!parent) continue;
    if (parent.closest(".mceNonEditable")) continue;
    if (parent.tagName === "STYLE" || parent.tagName === "SCRIPT") continue;

    const originalText = textNode.textContent ?? "";

    if (!originalText) continue;

    type Match = { start: number; end: number; expression: string };
    const matches: Match[] = [];

    for (const binding of bindings) {
      let fromIndex = 0;

      while (fromIndex < originalText.length) {
        const foundAt = originalText.indexOf(binding.value, fromIndex);

        if (foundAt === -1) break;

        matches.push({
          start: foundAt,
          end: foundAt + binding.value.length,
          expression: binding.expression,
        });

        fromIndex = foundAt + binding.value.length;
      }
    }

    if (matches.length === 0) continue;

    matches.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return b.end - b.start - (a.end - a.start);
    });

    const selected: Match[] = [];
    let lastEnd = 0;

    for (const match of matches) {
      if (match.start < lastEnd) continue;
      selected.push(match);
      lastEnd = match.end;
    }

    if (selected.length === 0) continue;

    const fragment = document.createDocumentFragment();
    let cursor = 0;

    for (const match of selected) {
      if (match.start > cursor) {
        fragment.appendChild(
          document.createTextNode(originalText.slice(cursor, match.start)),
        );
      }

      const protectedSpan = document.createElement("span");
      protectedSpan.className = "mceNonEditable";
      protectedSpan.setAttribute("data-var", match.expression);
      protectedSpan.textContent = originalText.slice(match.start, match.end);

      fragment.appendChild(protectedSpan);
      cursor = match.end;
    }

    if (cursor < originalText.length) {
      fragment.appendChild(document.createTextNode(originalText.slice(cursor)));
    }

    textNode.replaceWith(fragment);
  }

  return htmlRoot.serialize();
}

function restoreVariables(html: string): string {
  return html.replace(
    /<span[^>]*data-var="([^"]+)"[^>]*>[\s\S]*?<\/span>/g,
    (_, expression) => `{{${String(expression).trim()}}}`,
  );
}

function restoreAttributeVariables(
  html: string,
  template: string,
  data?: PrescriptionData,
): string {
  if (typeof window === "undefined") return html;

  const bindings = createVariableBindings(template, data);

  if (bindings.length === 0) return html;

  const htmlRoot = createHtmlRoot(html);
  const elements = htmlRoot.root.querySelectorAll("*");

  for (const element of elements) {
    for (const attr of Array.from(element.attributes)) {
      let nextValue = attr.value;
      let changed = false;

      for (const binding of bindings) {
        if (!nextValue.includes(binding.value)) continue;

        nextValue = nextValue
          .split(binding.value)
          .join(`{{${binding.expression}}}`);
        changed = true;
      }

      if (changed) {
        element.setAttribute(attr.name, nextValue);
      }
    }
  }

  return htmlRoot.serialize();
}

function getApiErrorMessage(
  error: unknown,
  fallback = "Failed to save prescription template.",
): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error && typeof error === "object") {
    const err = error as {
      message?: unknown;
      error?: unknown;
      data?: unknown;
      status?: unknown;
    };

    if (typeof err.message === "string" && err.message.trim()) {
      return err.message;
    }

    if (typeof err.error === "string" && err.error.trim()) {
      return err.error;
    }

    if (err.data && typeof err.data === "object") {
      const data = err.data as Record<string, unknown>;

      if (typeof data.message === "string" && data.message.trim()) {
        return data.message;
      }

      if (typeof data.error === "string" && data.error.trim()) {
        return data.error;
      }
    }

    if (typeof err.data === "string" && err.data.trim()) {
      return err.data;
    }

    if (err.status !== undefined) {
      return `Request failed with status ${String(err.status)}`;
    }
  }

  return fallback;
}

/* -----------------------------
   COMPONENT
------------------------------ */

export function ScannerHtmlPreview({
  templateHtml,
  data,
  onTemplateChange,
  onSaveSuccess,
}: ScannerHtmlPreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [editableTemplate, setEditableTemplate] = useState(
    sanitizeBrokenMarkerArtifacts(templateHtml),
  );
  const [editorDraft, setEditorDraft] = useState("");
  const [editorKey, setEditorKey] = useState(0);

  const { data: doctorResponse } = useGetDoctorQuery();

  const doctorId =
    (doctorResponse as GetDoctorResponse | undefined)?.result?.doctorProfile?.id ??
    "";

  const [updateDoctorPrescriptionTemplate, { isLoading: isSavingTemplate }] =
    useUpdateDoctorPrescriptionTemplateMutation();

  useEffect(() => {
    setEditableTemplate(sanitizeBrokenMarkerArtifacts(templateHtml));
  }, [templateHtml]);

  const editorCss = useMemo(
    () => extractEditorCss(editableTemplate),
    [editableTemplate],
  );

  const previewHtml = useMemo(() => {
    return injectTemplateData(editableTemplate, data);
  }, [editableTemplate, data]);

  const editorInitialHtml = useMemo(() => {
    const injected = injectTemplateData(editableTemplate, data);
    return protectInjectedValues(injected, editableTemplate, data);
  }, [editableTemplate, data]);

  const openEditor = () => {
    if (isSavingTemplate) return;

    setEditorKey((k) => k + 1);
    setEditorDraft(editorInitialHtml);
    setViewMode("edit");
  };

  const persistTemplate = async (nextTemplate: string) => {
    if (!doctorId) {
      return false;
    }

    try {
      await updateDoctorPrescriptionTemplate({
        doctorId,
        template: nextTemplate,
      }).unwrap();

      return true;
    } catch (error) {
      console.error(getApiErrorMessage(error));
      return false;
    }
  };

  const saveEditorChanges = async () => {
    if (isSavingTemplate) return;

    if (viewMode !== "edit") {
      onTemplateChange?.(editableTemplate);

      const isSuccess = await persistTemplate(editableTemplate);

      if (isSuccess) {
        onSaveSuccess?.(editableTemplate);
      }

      return;
    }

    const textRestored = restoreVariables(editorDraft);
    const attrRestored = restoreAttributeVariables(
      textRestored,
      editableTemplate,
      data,
    );
    const withDocShell = preserveTemplateDocumentShell(
      editableTemplate,
      sanitizeBrokenMarkerArtifacts(attrRestored),
    );
    const cleaned = preserveTemplateStyles(editableTemplate, withDocShell);

    setEditableTemplate(cleaned);
    onTemplateChange?.(cleaned);
    setViewMode("preview");

    const isSuccess = await persistTemplate(cleaned);

    if (isSuccess) {
      onSaveSuccess?.(cleaned);
    }
  };

  const discardEditorChanges = () => {
    if (isSavingTemplate) return;

    setEditorKey((k) => k + 1);
    setEditorDraft(editorInitialHtml);
    setViewMode("preview");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          color={viewMode === "preview" ? "primary" : "default"}
          size="sm"
          variant={viewMode === "preview" ? "solid" : "flat"}
          isDisabled={isSavingTemplate}
          onPress={() => setViewMode("preview")}
        >
          Preview
        </Button>

        <Button
          color={viewMode === "edit" ? "primary" : "default"}
          size="sm"
          variant={viewMode === "edit" ? "solid" : "flat"}
          isDisabled={isSavingTemplate}
          onPress={openEditor}
        >
          Edit
        </Button>

        <Button
          color="primary"
          size="sm"
          isLoading={isSavingTemplate}
          isDisabled={isSavingTemplate}
          onPress={() => void saveEditorChanges()}
        >
          Save
        </Button>

        <Button
          color="default"
          size="sm"
          variant="flat"
          isDisabled={viewMode !== "edit" || isSavingTemplate}
          onPress={discardEditorChanges}
        >
          Discard
        </Button>
      </div>

      {viewMode === "preview" ? (
        <iframe
          className="h-[700px] w-full rounded-large border border-default-200 bg-white"
          sandbox=""
          srcDoc={previewHtml}
          title="Prescription HTML preview"
        />
      ) : (
        <HTMLEditor
          key={editorKey}
          extraContentStyle={editorCss}
          id="scanner-template-editor"
          initialValue={editorInitialHtml}
          onChange={setEditorDraft}
        />
      )}
    </div>
  );
}