import fs from 'node:fs'
import path from 'node:path'

import { expect, test } from '../fixtures/test'
import { SCENARIO_IDS, type ScenarioId } from '../fixtures/routes'

export interface RouteCoverageEntry {
  routePath: string
  routeFile: string
  scenarioId: ScenarioId
  expectation: 'render' | 'redirect'
}

const routeCoverageManifest: RouteCoverageEntry[] = [
  {
    routePath: 'NOT_FOUND',
    routeFile: 'src/routes/__root.tsx',
    scenarioId: SCENARIO_IDS.NOT_FOUND_RENDER,
    expectation: 'render',
  },
  {
    routePath: '/auth',
    routeFile: 'src/routes/auth/route.tsx',
    scenarioId: SCENARIO_IDS.AUTH_PAGE_RENDER,
    expectation: 'render',
  },
  {
    routePath: '/auth/callback',
    routeFile: 'src/routes/auth_/callback.tsx',
    scenarioId: SCENARIO_IDS.AUTH_CALLBACK_REDIRECT,
    expectation: 'redirect',
  },
  {
    routePath: '/lists',
    routeFile: 'src/routes/_protected/route.tsx',
    scenarioId: SCENARIO_IDS.PROTECTED_GUARD_REDIRECTS_TO_AUTH,
    expectation: 'redirect',
  },
  {
    routePath: '/',
    routeFile: 'src/routes/_protected/index.tsx',
    scenarioId: SCENARIO_IDS.HOME_GUEST_RENDER,
    expectation: 'render',
  },
  {
    routePath: '/search',
    routeFile: 'src/routes/_protected/search/route.tsx',
    scenarioId: SCENARIO_IDS.SEARCH_ROUTE_RENDER,
    expectation: 'render',
  },
  {
    routePath: '/search',
    routeFile: 'src/routes/_protected/search/route.tsx',
    scenarioId: SCENARIO_IDS.SEARCH_QUERY_RESULTS,
    expectation: 'render',
  },
  {
    routePath: '/shared',
    routeFile: 'src/routes/_protected/shared/route.tsx',
    scenarioId: SCENARIO_IDS.SHARED_ROUTE_RENDER_FROM_DATA,
    expectation: 'render',
  },
  {
    routePath: '/details/$type/$id',
    routeFile: 'src/routes/_protected/details/$type/$id.tsx',
    scenarioId: SCENARIO_IDS.DETAILS_VALID_RENDER,
    expectation: 'render',
  },
  {
    routePath: '/details/$type/$id',
    routeFile: 'src/routes/_protected/details/$type/$id.tsx',
    scenarioId: SCENARIO_IDS.SEARCH_RESULT_OPENS_DETAILS,
    expectation: 'render',
  },
  {
    routePath: '/details/$type/$id',
    routeFile: 'src/routes/_protected/details/$type/$id.tsx',
    scenarioId: SCENARIO_IDS.DETAILS_ADD_TO_DEFAULT_LIST,
    expectation: 'render',
  },
  {
    routePath: '/details/$type/$id',
    routeFile: 'src/routes/_protected/details/$type/$id.tsx',
    scenarioId: SCENARIO_IDS.DETAILS_MARK_WATCHED_FILTERS,
    expectation: 'render',
  },
  {
    routePath: '/details/$type/$id',
    routeFile: 'src/routes/_protected/details/$type/$id.tsx',
    scenarioId: SCENARIO_IDS.DETAILS_INVALID_TYPE_REDIRECT,
    expectation: 'redirect',
  },
  {
    routePath: '/lists/',
    routeFile: 'src/routes/_protected/lists/index.tsx',
    scenarioId: SCENARIO_IDS.LISTS_INDEX_RENDER,
    expectation: 'render',
  },
  {
    routePath: '/lists/$id',
    routeFile: 'src/routes/_protected/lists/$id.tsx',
    scenarioId: SCENARIO_IDS.LISTS_JOIN_EDITOR_FLOW,
    expectation: 'render',
  },
  {
    routePath: '/lists/$id',
    routeFile: 'src/routes/_protected/lists/$id.tsx',
    scenarioId: SCENARIO_IDS.LIST_SHARE_COPY_VIEWER_LINK,
    expectation: 'render',
  },
  {
    routePath: '/lists/$id',
    routeFile: 'src/routes/_protected/lists/$id.tsx',
    scenarioId: SCENARIO_IDS.LISTS_JOIN_VIEWER_READ_ONLY,
    expectation: 'render',
  },
  {
    routePath: '/lists/$id/join',
    routeFile: 'src/routes/_protected/lists/$id.join.tsx',
    scenarioId: SCENARIO_IDS.LISTS_JOIN_EDITOR_FLOW,
    expectation: 'render',
  },
  {
    routePath: '/lists/$id/join',
    routeFile: 'src/routes/_protected/lists/$id.join.tsx',
    scenarioId: SCENARIO_IDS.LISTS_JOIN_VIEWER_READ_ONLY,
    expectation: 'render',
  },
  {
    routePath: '/lists/$id/join',
    routeFile: 'src/routes/_protected/lists/$id.join.tsx',
    scenarioId: SCENARIO_IDS.LISTS_JOIN_INVALID_ROLE_FALLBACK,
    expectation: 'render',
  },
]

function normalizeRoutePath(routePath: string): string {
  if (routePath === 'NOT_FOUND') return routePath
  if (routePath === '/') return routePath
  return routePath.replace(/\/+$/, '')
}

function walkFilesRecursively(rootDir: string): string[] {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const absolutePath = path.join(rootDir, entry.name)

    if (entry.isDirectory()) {
      files.push(...walkFilesRecursively(absolutePath))
      continue
    }

    files.push(absolutePath)
  }

  return files
}

function getPublicPathsFromRouteTree(repoRoot: string): string[] {
  const routeTreePath = path.join(repoRoot, 'src', 'routeTree.gen.ts')
  const source = fs.readFileSync(routeTreePath, 'utf8')
  const fullPathsBlock = source.match(/fullPaths:\s*([\s\S]*?)\n\s*fileRoutesByTo:/)

  if (!fullPathsBlock) {
    throw new Error('Unable to parse fullPaths from src/routeTree.gen.ts')
  }

  return Array.from(fullPathsBlock[1].matchAll(/'([^']+)'/g), (match) => match[1]).sort()
}

function getScenarioSpecSource(repoRoot: string): string {
  const specsDir = path.join(repoRoot, 'e2e', 'routes')

  const specFiles = walkFilesRecursively(specsDir)
    .filter((filePath) => filePath.endsWith('.spec.ts'))
    .filter((filePath) => !filePath.endsWith('coverage-contract.spec.ts'))
    .filter((filePath) => !filePath.endsWith('journey-contract.spec.ts'))

  return specFiles.map((filePath) => fs.readFileSync(filePath, 'utf8')).join('\n')
}

test('ROUTE_MANIFEST_FILES: every route file in manifest exists', () => {
  const repoRoot = process.cwd()
  const missingRouteFiles = routeCoverageManifest
    .map((entry) => entry.routeFile)
    .filter((routeFile, index, allFiles) => allFiles.indexOf(routeFile) === index)
    .filter((routeFile) => !fs.existsSync(path.join(repoRoot, routeFile)))

  expect(missingRouteFiles).toEqual([])
})

test('ROUTE_PATH_CONTRACT: every public routeTree path and NOT_FOUND are represented in manifest', () => {
  const repoRoot = process.cwd()
  const publicPaths = getPublicPathsFromRouteTree(repoRoot).map(normalizeRoutePath).sort()
  const manifestPaths = Array.from(
    new Set(
      routeCoverageManifest
        .map((entry) => entry.routePath)
        .filter((routePath) => routePath !== 'NOT_FOUND')
        .map(normalizeRoutePath),
    ),
  ).sort()

  const missingPublicPaths = publicPaths.filter((routePath) => !manifestPaths.includes(routePath))

  expect(routeCoverageManifest.some((entry) => entry.routePath === 'NOT_FOUND')).toBe(true)
  expect(missingPublicPaths).toEqual([])
})

test('ROUTE_SCENARIO_MAPPING: manifest scenario IDs exist in route specs', () => {
  const repoRoot = process.cwd()
  const source = getScenarioSpecSource(repoRoot)
  const scenarioIds = Array.from(new Set(routeCoverageManifest.map((entry) => entry.scenarioId))).sort()
  const missingScenarioIds = scenarioIds.filter((scenarioId) => !source.includes(scenarioId))

  expect(missingScenarioIds).toEqual([])
})
