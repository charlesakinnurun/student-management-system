import { prisma } from "@/lib/db";
import { notFound, unprocessable } from "@/lib/http/errors";
import { recordAudit } from "@/lib/audit";
import type { GradingBand } from "@/lib/domain/grading";
import type { UpsertGradingSetInput } from "@/lib/validation/user";

export const DEFAULT_GRADING_SET = "default";

/** Ordered bands for a grading set. Falls back to the default set. */
export async function getGradingBands(setName: string = DEFAULT_GRADING_SET): Promise<GradingBand[]> {
  const rules = await prisma.gradingRule.findMany({
    where: { setName },
    orderBy: { minScore: "desc" },
    select: { minScore: true, maxScore: true, grade: true, points: true },
  });
  return rules;
}

export interface GradingSet {
  setName: string;
  bands: Array<GradingBand & { id: string }>;
}

export async function listGradingSets(): Promise<GradingSet[]> {
  const rules = await prisma.gradingRule.findMany({
    orderBy: [{ setName: "asc" }, { minScore: "desc" }],
  });
  const grouped = new Map<string, GradingSet>();
  for (const rule of rules) {
    const set = grouped.get(rule.setName) ?? { setName: rule.setName, bands: [] };
    set.bands.push({
      id: rule.id,
      minScore: rule.minScore,
      maxScore: rule.maxScore,
      grade: rule.grade,
      points: rule.points,
    });
    grouped.set(rule.setName, set);
  }
  return [...grouped.values()];
}

/**
 * Replace all bands for a grading set atomically. Institution admins can define
 * alternative scales (e.g. a 4.0 GPA set) without touching application code.
 */
export async function upsertGradingSet(input: UpsertGradingSetInput, actorId: string) {
  const overrides = input.bands.filter((band) => band.maxScore > 100 || band.minScore < 0);
  if (overrides.length > 0) throw unprocessable("Scores must be between 0 and 100");

  await prisma.$transaction([
    prisma.gradingRule.deleteMany({ where: { setName: input.setName } }),
    prisma.gradingRule.createMany({
      data: input.bands.map((band) => ({
        setName: input.setName,
        minScore: band.minScore,
        maxScore: band.maxScore,
        grade: band.grade,
        points: band.points,
      })),
    }),
  ]);

  await recordAudit({
    actorId,
    action: "grading.upsert",
    resource: "GradingRule",
    metadata: { setName: input.setName, bands: input.bands.length },
  });

  return listGradingSets();
}

export async function deleteGradingSet(setName: string, actorId: string) {
  if (setName === DEFAULT_GRADING_SET) {
    throw unprocessable("The default grading set cannot be deleted");
  }
  const existing = await prisma.gradingRule.findFirst({ where: { setName } });
  if (!existing) throw notFound("Grading set not found");

  await prisma.gradingRule.deleteMany({ where: { setName } });
  await recordAudit({
    actorId,
    action: "grading.delete",
    resource: "GradingRule",
    metadata: { setName },
  });
}
