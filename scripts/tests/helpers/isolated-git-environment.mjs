import process from "node:process";

export function isolatedGitEnvironment(environment = process.env) {
  return Object.fromEntries(
    Object.entries(environment).filter(([key]) => !key.startsWith("GIT_")),
  );
}

export function isolateGitProcessEnvironment(environment = process.env) {
  for (const key of Object.keys(environment)) {
    if (key.startsWith("GIT_"))
      delete environment[key];
  }
}
