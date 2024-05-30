import { VercelRequest, VercelResponse } from "@vercel/node";
import { readFile, readdir } from "fs/promises";
import { compare } from "semver";
import { resolve } from "path";

const sendError = (response: VercelResponse) => {
  // NOTE: 本家のAPIはapplication/jsonで生テキストを送ってくる。クソ
  return response.status(200).setHeader("Content-Type", "application/json").send("malformed version");
};

export default async (request: VercelRequest, response: VercelResponse) => {
  console.log(request.headers, request.query);

  const version = Array.isArray(request.query.version) ? request.query.version[0] : request.query.version;
  const versionDir = resolve(process.cwd(), "dist", "versions");

  if (!version) {
    const latestVersionFile = resolve(versionDir, "latest", "latest.json");
    const versionJson = await readFile(latestVersionFile, "utf8");
    response.status(200).setHeader("Content-Type", "application/json").send(versionJson);
    return;
  }

  const versionFile = resolve(versionDir, `${version}.json`);
  try {
    const versionJson = await readFile(versionFile, "utf8");
    response.status(200).setHeader("Content-Type", "application/json").send(versionJson);
  } catch (e) {
    console.error(e);
    const latestVersionFile = resolve(versionDir, "latest", "latest.json");
    const latestVersionJson = await readFile(latestVersionFile, "utf8");
    const { updatesAvailable } = JSON.parse(latestVersionJson);
    const { version: latestVersion } = updatesAvailable[0];
    if (compare(latestVersion, version) === 1) {
      response.status(200).setHeader("Content-Type", "application/json").send(latestVersionJson);
      return;
    }

    const json = { "updatesAvailable": [] };
    response.status(200).setHeader("Content-Type", "application/json").send(JSON.stringify(json));
  }
};