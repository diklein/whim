/** Where Whim's source lives. A stranger gets the hook from here; a deployment can point at its own fork. */
export const REPO = (process.env.NEXT_PUBLIC_WHIM_REPO ?? "https://github.com/diklein/whim").replace(/\/$/, "");
export const REPO_RAW = REPO.replace("https://github.com/", "https://raw.githubusercontent.com/") + "/main";
export const HOOK_FILES = ["whim-prompt.mjs", "whim-stop.mjs", "whim-capture.mjs"] as const;
