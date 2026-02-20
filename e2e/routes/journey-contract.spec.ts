import fs from 'node:fs'
import path from 'node:path'

import { expect, test } from '../fixtures/test'
import { journeyCoverageManifest } from '../fixtures/journeys'
import { SCENARIO_IDS } from '../fixtures/routes'

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

function normalizeRoutePath(routePath: string): string {
  if (routePath === 'NOT_FOUND') return routePath
  if (routePath === '/') return routePath
  return routePath.replace(/\/+$/, '')
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

function getRouteSpecFiles(repoRoot: string): string[] {
  const specsDir = path.join(repoRoot, 'e2e', 'routes')

  return walkFilesRecursively(specsDir)
    .filter((filePath) => filePath.endsWith('.spec.ts'))
    .filter((filePath) => !filePath.endsWith('coverage-contract.spec.ts'))
    .filter((filePath) => !filePath.endsWith('journey-contract.spec.ts'))
}

function extractScenarioIds(specSources: string[]): Set<string> {
  const ids = new Set<string>()
  const scenarioRegex = /SCENARIO_IDS\.([A-Z0-9_]+)/g

  for (const source of specSources) {
    for (const match of source.matchAll(scenarioRegex)) {
      ids.add(match[1])
    }
  }

  return ids
}

function extractSkippedScenarioIds(specSources: string[]): Set<string> {
  const ids = new Set<string>()
  const skippedScenarioRegex =
    /test\.skip(?:\.[A-Za-z]+)?\s*\(\s*`[^`]*\[\$\{SCENARIO_IDS\.([A-Z0-9_]+)\}\][^`]*`/g

  for (const source of specSources) {
    for (const match of source.matchAll(skippedScenarioRegex)) {
      ids.add(match[1])
    }
  }

  return ids
}

test('JOURNEY_CONTRACT_BLOCKING_ENTRIES: blocking journeys must define required scenarios', () => {
  const invalidJourneys = journeyCoverageManifest
    .filter((journey) => journey.blocking)
    .filter((journey) => journey.requiredScenarioIds.length === 0)
    .map((journey) => journey.journeyId)

  expect(invalidJourneys).toEqual([])
})

test('JOURNEY_CONTRACT_SCENARIOS: required scenarios must exist and cannot be skipped', () => {
  const repoRoot = process.cwd()
  const specFiles = getRouteSpecFiles(repoRoot)
  const specSources = specFiles.map((filePath) => fs.readFileSync(filePath, 'utf8'))
  const declaredScenarioIds = extractScenarioIds(specSources)
  const skippedScenarioIds = extractSkippedScenarioIds(specSources)
  const requiredScenarioIds = Array.from(
    new Set(journeyCoverageManifest.flatMap((journey) => journey.requiredScenarioIds)),
  ).sort()

  const missingScenarioIds = requiredScenarioIds.filter((scenarioId) => !declaredScenarioIds.has(scenarioId))
  const requiredButSkipped = requiredScenarioIds.filter((scenarioId) => skippedScenarioIds.has(scenarioId))

  expect(missingScenarioIds).toEqual([])
  expect(requiredButSkipped).toEqual([])
})

test('JOURNEY_CONTRACT_SCENARIO_COVERAGE: all SCENARIO_IDS must belong to journeys and vice-versa', () => {
  const declaredScenarioIds = Object.keys(SCENARIO_IDS).sort()
  const journeyScenarioIds = Array.from(
    new Set(journeyCoverageManifest.flatMap((journey) => journey.requiredScenarioIds)),
  ).sort() as string[]

  const missingInJourneys = declaredScenarioIds.filter((scenarioId) => !journeyScenarioIds.includes(scenarioId))
  const unknownJourneyScenarioIds = journeyScenarioIds.filter(
    (scenarioId) => !declaredScenarioIds.includes(scenarioId),
  )

  expect(missingInJourneys).toEqual([])
  expect(unknownJourneyScenarioIds).toEqual([])
})

test('JOURNEY_CONTRACT_PATHS: all public paths and NOT_FOUND must belong to journeys', () => {
  const repoRoot = process.cwd()
  const publicPaths = getPublicPathsFromRouteTree(repoRoot).map(normalizeRoutePath).sort()
  const touchedPaths = Array.from(
    new Set(
      journeyCoverageManifest
        .flatMap((journey) => journey.touchedPaths)
        .filter((routePath) => routePath !== 'NOT_FOUND')
        .map(normalizeRoutePath),
    ),
  ).sort()

  const missingPublicPaths = publicPaths.filter((routePath) => !touchedPaths.includes(routePath))
  const unknownTouchedPaths = touchedPaths.filter((routePath) => !publicPaths.includes(routePath))
  const hasNotFound = journeyCoverageManifest.some((journey) =>
    journey.touchedPaths.some((routePath) => routePath === 'NOT_FOUND'),
  )

  expect(hasNotFound).toBe(true)
  expect(missingPublicPaths).toEqual([])
  expect(unknownTouchedPaths).toEqual([])
})
