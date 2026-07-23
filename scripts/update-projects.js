#!/usr/bin/env node

const fs = require("node:fs");

const USERNAME = "maitrungluan-05";
const README_PATH = "README.md";
const START = "<!-- AUTO-PROJECTS:START -->";
const END = "<!-- AUTO-PROJECTS:END -->";
const MAX_PROJECTS = 6;

const escapeHtml = (value = "") =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

const encode = (value) => encodeURIComponent(value).replace(/%20/g, "_");

async function fetchRepositories() {
  const response = await fetch(
    `https://api.github.com/users/${USERNAME}/repos?type=owner&sort=updated&direction=desc&per_page=100`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": `${USERNAME}-profile-updater`,
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

function selectProjects(repositories) {
  const candidates = repositories.filter(
    (repo) => !repo.fork && !repo.archived && repo.name !== USERNAME,
  );
  const featured = candidates.filter((repo) => repo.topics.includes("featured"));
  return (featured.length ? featured : candidates).slice(0, MAX_PROJECTS);
}

function renderCard(repo) {
  const description = escapeHtml(repo.description || "A production project by Mai Trung Luân.");
  const language = escapeHtml(repo.language || "Multi-language");
  const topics = repo.topics.slice(0, 5);
  const topicLine = topics.length
    ? topics.map((topic) => `<code>${escapeHtml(topic)}</code>`).join(" ")
    : "<code>software</code> <code>development</code>";
  const starsUrl = `https://img.shields.io/github/stars/${USERNAME}/${encodeURIComponent(repo.name)}?style=flat-square&amp;labelColor=020617&amp;color=0284c7&amp;logo=github&amp;logoColor=38bdf8`;
  const languageUrl = `https://img.shields.io/badge/${encode(language)}-020617?style=flat-square&amp;logoColor=38bdf8`;

  return `<td width="50%" valign="top">

### <a href="${repo.html_url}">${escapeHtml(repo.name)}</a>

${description}

${topicLine}

<a href="${repo.html_url}/stargazers"><img src="${starsUrl}" alt="Stars for ${escapeHtml(repo.name)}" /></a>
<img src="${languageUrl}" alt="Primary language: ${language}" />
<a href="${repo.html_url}"><img src="https://img.shields.io/badge/VIEW_REPOSITORY-020617?style=flat-square&amp;logo=github&amp;logoColor=38bdf8" alt="View ${escapeHtml(repo.name)}" /></a>

</td>`;
}

function renderProjects(projects) {
  if (!projects.length) {
    return `${START}\n\n<div align="center">No public projects are available yet.</div>\n\n${END}`;
  }

  const rows = [];
  for (let index = 0; index < projects.length; index += 2) {
    const pair = projects.slice(index, index + 2);
    if (pair.length === 1) {
      rows.push(`<tr>\n${renderCard(pair[0]).replace('width="50%"', 'colspan="2"')}\n</tr>`);
    } else {
      rows.push(`<tr>\n${pair.map(renderCard).join("\n")}\n</tr>`);
    }
  }

  return `${START}\n<table>\n${rows.join("\n")}\n</table>\n\n<div align="center">\n<a href="https://github.com/${USERNAME}?tab=repositories"><img src="https://img.shields.io/badge/EXPLORE_ALL_PROJECTS-020617?style=for-the-badge&amp;logo=github&amp;logoColor=38bdf8" alt="Explore all projects" /></a>\n</div>\n${END}`;
}

async function main() {
  const repositories = await fetchRepositories();
  const projects = selectProjects(repositories);
  const readme = fs.readFileSync(README_PATH, "utf8");
  const startIndex = readme.indexOf(START);
  const endIndex = readme.indexOf(END);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error("README project markers are missing or invalid.");
  }

  const generated = renderProjects(projects);
  const updated = `${readme.slice(0, startIndex)}${generated}${readme.slice(endIndex + END.length)}`;
  fs.writeFileSync(README_PATH, updated);
  console.log(`Updated README with ${projects.length} project(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
