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

  const version = request.query.version;
  const versionDir = resolve(process.cwd(), "dist", "versions");

  if (!version) {
    const files = await readdir(versionDir, "utf8");
    const versions = files.map((file) => file.replace(".json", ""));
    const latest = versions.sort(compare).reverse()[0];
    response.status(200).setHeader("Content-Type", "application/json").send(latest);
    return;
  }

  const versionFile = resolve(versionDir, `${version}.json`);
  try {
    const versionJson = await readFile(versionFile, "utf8");
    response.status(200).setHeader("Content-Type", "application/json").send(versionJson);
  } catch (e) {
    console.error(e);

    const json = { "updatesAvailable": [] };
    response.status(200).setHeader("Content-Type", "application/json").send(JSON.stringify(json));
  }
};