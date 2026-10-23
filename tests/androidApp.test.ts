import { describe, expect, it } from "vitest";
import { androidAppFor, openInAppUrl } from "../app/src/androidApp";

describe("androidAppFor", () => {
  it("knows the chat sites that hand their urls to an app", () => {
    expect(androidAppFor("https://chatgpt.com/share/abc")).toBe(
      "com.openai.chatgpt",
    );
    expect(androidAppFor("https://claude.ai/chat/abc")).toBe(
      "com.anthropic.claude",
    );
    expect(androidAppFor("https://gemini.google.com/app/abc")).toBe(
      "com.google.android.apps.bard",
    );
  });

  it("ignores www and case", () => {
    expect(androidAppFor("https://WWW.ChatGPT.com/share/abc")).toBe(
      "com.openai.chatgpt",
    );
  });

  it("has nothing to offer for an ordinary site", () => {
    expect(androidAppFor("https://example.com/post")).toBeNull();
  });

  it("survives a url it cannot parse", () => {
    expect(androidAppFor("not a url")).toBeNull();
  });
});

describe("openInAppUrl", () => {
  const fallback = "https://chatgpt.com/share/abc#:~:text=the%20exact%20words";

  it("builds an intent chrome can hand to the app", () => {
    const url = openInAppUrl("https://chatgpt.com/share/abc", fallback);
    expect(url).toContain("intent://chatgpt.com/share/abc#Intent;");
    expect(url).toContain("scheme=https");
    expect(url).toContain("package=com.openai.chatgpt");
    expect(url?.endsWith(";end")).toBe(true);
  });

  it("keeps the query, which can be what picks the conversation", () => {
    const url = openInAppUrl("https://gemini.google.com/app?id=7", fallback);
    expect(url).toContain("intent://gemini.google.com/app?id=7#Intent;");
  });

  it("drops the text fragment, since the intent spec lives in the fragment", () => {
    const url = openInAppUrl(fallback, fallback);
    expect(url).not.toContain(":~:text");
    expect(url).toContain("intent://chatgpt.com/share/abc#Intent;");
  });

  it("encodes the fallback so its own punctuation cannot end the intent early", () => {
    const url = openInAppUrl("https://chatgpt.com/share/abc", fallback) ?? "";
    const spec = url.slice(url.indexOf("#Intent;") + 8, -";end".length);
    const fields = spec.split(";");
    expect(fields).toHaveLength(3);
    const encoded = fields[2].replace("S.browser_fallback_url=", "");
    expect(decodeURIComponent(encoded)).toBe(fallback);
  });

  it("hides the fallback's own # so it cannot end the intent spec early", () => {
    const url = openInAppUrl("https://chatgpt.com/share/abc", fallback) ?? "";
    // Only one # in the whole link: the one that opens the intent spec.
    expect(url.split("#")).toHaveLength(2);
    expect(url).toContain("%23");
  });

  it("offers nothing for a site with no app to open", () => {
    expect(
      openInAppUrl("https://example.com/post", "https://example.com/post"),
    ).toBeNull();
  });
});
