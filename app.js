'use strict';
// Solo datos públicos; nunca requiere tokens ni accede a repositorios privados.
const USER = 'BryanPatri';
const BASE = `https://api.github.com/users/${USER}`;
const list = document.getElementById('project-list');
const projectStatus = document.getElementById('project-status');
const statsStatus = document.getElementById('stats-status');
const number = new Intl.NumberFormat('es');
let repositories = [];
let repositoriesReady = false;
let currentFilter = 'all';

async function request(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {signal: controller.signal, headers: {Accept: 'application/vnd.github+json'}});
    if (!response.ok) throw new Error(`GitHub respondió ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timer); }
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderProjects() {
  list.replaceChildren();
  if (!repositoriesReady) return;
  const selected = repositories.filter(repo => currentFilter === 'all' || (currentFilter === 'fork' ? repo.fork : !repo.fork));
  projectStatus.textContent = selected.length ? `${number.format(selected.length)} repositorios públicos · ordenados por actualización.` : 'No hay repositorios públicos para este filtro.';
  selected.forEach((repo, index) => {
    const row = element('article', 'project-row');
    const cover = element('div', 'project-cover');
    cover.setAttribute('aria-hidden', 'true');
    cover.append(element('span', 'cover-symbol', repo.fork ? '{ · }' : '</>'));
    cover.append(element('span', 'cover-caption', `REPOSITORIO / ${String(index + 1).padStart(2, '0')}`));
    row.append(cover);
    const content = element('div', 'project-content');
    const heading = element('h3');
    heading.style.margin = '0';
    const title = element('a', 'project-title', repo.name.replaceAll('_', ' '));
    // Construir enlaces desde nombres recibidos, sin insertar HTML de terceros.
    const url = `https://github.com/${USER}/${encodeURIComponent(repo.name)}`;
    title.href = url;
    heading.append(title);
    content.append(heading);
    content.append(element('p', 'project-description', repo.description || 'Explora el repositorio para consultar su contenido y documentación.'));
    const tags = element('div', 'project-tags');
    tags.append(element('span', '', 'Público'), element('span', '', repo.fork ? 'Fork' : 'Repositorio propio'));
    if (repo.language) tags.append(element('span', '', repo.language));
    if (repo.archived) tags.append(element('span', '', 'Archivado'));
    content.append(tags);
    row.append(content);
    const arrow = element('a', 'repo-link', '↗');
    arrow.href = url;
    arrow.setAttribute('aria-label', `Ver ${repo.name} en GitHub`);
    row.append(arrow);
    list.append(row);
  });
}

document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  currentFilter = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(item => {
    const active = item === button;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  renderProjects();
}));

async function loadProfile() {
  try {
    const profile = await request(BASE);
    document.getElementById('stat-repos').textContent = number.format(profile.public_repos);
    document.getElementById('stat-followers').textContent = number.format(profile.followers);
    document.getElementById('stat-following').textContent = number.format(profile.following);
    return true;
  } catch {
    return false;
  }
}

async function loadRepositories() {
  try {
    const result = [];
    // La paginación evita presentar una suma parcial de estrellas como total.
    for (let page = 1; ; page++) {
      const batch = await request(`${BASE}/repos?per_page=100&sort=updated&type=owner&page=${page}`);
      result.push(...batch);
      if (batch.length < 100) break;
    }
    repositories = result.filter(repo => !repo.private);
    repositoriesReady = true;
    renderProjects();
    const stars = repositories.filter(repo => !repo.fork).reduce((sum, repo) => sum + repo.stargazers_count, 0);
    document.getElementById('stat-stars').textContent = number.format(stars);
    return true;
  } catch {
    projectStatus.textContent = 'No se pudo consultar GitHub. Puedes abrir todos los repositorios con el enlace de esta sección. Si se alcanzó el límite de consultas, vuelve a intentarlo más tarde.';
    return false;
  }
}

async function init() {
  const [profileOK, reposOK] = await Promise.all([loadProfile(), loadRepositories()]);
  statsStatus.textContent = profileOK && reposOK
    ? `Datos consultados el ${new Date().toLocaleString('es-EC', {dateStyle: 'medium', timeStyle: 'short'})}.`
    : 'Algunos datos no están disponibles. El símbolo — indica información sin consultar; no significa cero.';
}
init();
