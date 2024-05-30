#!/usr/bin/env bun

import { readFile, readdir, mkdir, rm, writeFile } from "fs/promises";
import { resolve, basename, extname } from "path";
import { compareVersions } from "compare-versions";
import { VersionTemplate } from "../lib/versionTemplate";

interface Version extends VersionTemplate {
  version: string;
  releaseNotes: string;
}

const formatVersion = (version: string) => {
  // HACK: validじゃないけど
  return basename(version, extname(version)).replace(/^v/, "").replace(/-plusminus\./, "-").replace(/-(\d*)$/, ".$1");
}

const distDir = resolve(__dirname, "../dist");
await rm(distDir, { recursive: true, force: true });
const distVersionsDir = resolve(distDir, "versions");
await mkdir(distVersionsDir, { recursive: true });
const distLatestVersionsDir = resolve(distVersionsDir, "latest");
await mkdir(distLatestVersionsDir, { recursive: true });

const versionsDir = resolve(__dirname, "../versions");
const files = await readdir(versionsDir, "utf8");
files.sort((a, b) => compareVersions(formatVersion(a), formatVersion(b)));

console.log("versions:");
files.forEach((file) => console.log(file));

const versions: Version[] = [];
for (const file of files) {
  const version = basename(file, extname(file));
  const versionPath = resolve(versionsDir, file);
  const body = await readFile(versionPath);
  const versionTemplate: VersionTemplate = JSON.parse(body.toString("utf8"));
  versions.push({
    ...versionTemplate,
    version: version.replace(/^v/, ""),
    releaseNotes: `${process.env.RELEASE_NOTE_URL}${version}`
  });
}
const latestVersion = versions[versions.length - 1];

console.log("updates:");
for (const [index, version] of versions.entries()) {
  const updatesAvailable = [];
  for (let i = index + 1; i < versions.length; i++) {
    // FIXME: stable, stable, beta, beta, rc, stable みたいに途中であまり意味が無いプレリリースが入らないようにしたい
    updatesAvailable.push(versions[i]);
  }

  console.log(version.version, "->", updatesAvailable.map((update) => update.version).join(", ") || "-");

  const versionPath = resolve(distVersionsDir, `${version.version}.json`);
  const body = JSON.stringify({ updatesAvailable });
  await writeFile(versionPath, body, "utf8");
}

// latest
{
  const updatesAvailable = [latestVersion];
  console.log("latest", "->", updatesAvailable.map((update) => update.version).join(", ") || "-");

  const versionPath = resolve(distVersionsDir, "latest", "latest.json");
  const body = JSON.stringify({ updatesAvailable });
  await writeFile(versionPath, body, "utf8");
}

