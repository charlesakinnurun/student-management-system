"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";

interface Band {
  grade: string;
  minScore: string;
  maxScore: string;
  points: string;
}

interface GradingSet {
  setName: string;
  bands: Array<{ id: string; minScore: number; maxScore: number; grade: string; points: number }>;
}

const EMPTY_BAND: Band = { grade: "", minScore: "", maxScore: "", points: "" };

export default function GradingRulesPage() {
  const toast = useToast();
  const [sets, setSets] = useState<GradingSet[]>([]);
  const [selected, setSelected] = useState<string>("default");
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newSetName, setNewSetName] = useState("");

  function load(preferred?: string) {
    setLoading(true);
    setError(null);
    api
      .get<GradingSet[]>("/api/grading-rules")
      .then((result) => {
        setSets(result);
        const name = preferred ?? (result.find((s) => s.setName === "default") ? "default" : result[0]?.setName ?? "default");
        setSelected(name);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load grading rules"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const set = sets.find((s) => s.setName === selected);
    setBands(
      set
        ? set.bands.map((b) => ({
            grade: b.grade,
            minScore: String(b.minScore),
            maxScore: String(b.maxScore),
            points: String(b.points),
          }))
        : [],
    );
  }, [sets, selected]);

  function updateBand(index: number, key: keyof Band, value: string) {
    setBands((current) => current.map((band, i) => (i === index ? { ...band, [key]: value } : band)));
  }

  async function handleSave() {
    const parsed = bands.map((band) => ({
      grade: band.grade.trim().toUpperCase(),
      minScore: Number(band.minScore),
      maxScore: Number(band.maxScore),
      points: Number(band.points),
    }));

    if (parsed.some((band) => !band.grade || !Number.isFinite(band.minScore) || !Number.isFinite(band.maxScore) || !Number.isFinite(band.points))) {
      toast.error("Every band needs a grade, minimum, maximum and points value.");
      return;
    }
    if (parsed.some((band) => band.maxScore <= band.minScore)) {
      toast.error("Each band's maximum must be greater than its minimum.");
      return;
    }

    setSaving(true);
    try {
      await api.put("/api/grading-rules", { setName: selected, bands: parsed });
      toast.success("Grading rules saved");
      load(selected);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save grading rules");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateSet() {
    const name = newSetName.trim();
    if (!name) {
      toast.error("Enter a name for the new grading set.");
      return;
    }
    setSaving(true);
    try {
      await api.put("/api/grading-rules", {
        setName: name,
        bands: bands.map((band) => ({
          grade: band.grade.trim().toUpperCase(),
          minScore: Number(band.minScore),
          maxScore: Number(band.maxScore),
          points: Number(band.points),
        })),
      });
      toast.success(`Grading set "${name}" created`);
      setNewSetName("");
      load(name);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create grading set");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSet(name: string) {
    try {
      await api.delete(`/api/grading-rules/${encodeURIComponent(name)}`);
      toast.success("Grading set deleted");
      load("default");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete grading set");
    }
  }

  if (loading) {
    return (
      <Card>
        <TableSkeleton columns={4} />
      </Card>
    );
  }
  if (error) {
    return (
      <Card>
        <ErrorState message={error} onRetry={() => load()} />
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        title="Grading rules"
        description="Configurable score bands that map totals to letter grades and grade points. Not hardcoded."
        actions={
          <div className="flex items-center gap-2">
            <Input
              placeholder="New set name"
              value={newSetName}
              onChange={(event) => setNewSetName(event.target.value)}
              className="h-9 w-40"
              aria-label="New grading set name"
            />
            <Button variant="outline" onClick={handleCreateSet} loading={saving}>
              Duplicate as new set
            </Button>
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-2 py-4">
          <span className="text-xs font-medium">Grading set:</span>
          {sets.map((set) => (
            <Button
              key={set.setName}
              variant={set.setName === selected ? "primary" : "outline"}
              size="sm"
              onClick={() => setSelected(set.setName)}
            >
              {set.setName}
            </Button>
          ))}
          {selected !== "default" ? (
            <Button variant="ghost" size="sm" onClick={() => handleDeleteSet(selected)}>
              Delete set
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bands — {selected}</CardTitle>
          <p className="text-xs text-muted-foreground">
            The band whose range contains a student&apos;s total determines their grade and grade points.
          </p>
        </CardHeader>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Grade</TableHeaderCell>
              <TableHeaderCell>Min score</TableHeaderCell>
              <TableHeaderCell>Max score</TableHeaderCell>
              <TableHeaderCell>Points</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bands.map((band, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Input
                    value={band.grade}
                    aria-label={`Band ${index + 1} grade`}
                    className="h-9 w-20"
                    onChange={(event) => updateBand(index, "grade", event.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={band.minScore}
                    aria-label={`Band ${index + 1} minimum score`}
                    className="h-9 w-24"
                    onChange={(event) => updateBand(index, "minScore", event.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={band.maxScore}
                    aria-label={`Band ${index + 1} maximum score`}
                    className="h-9 w-24"
                    onChange={(event) => updateBand(index, "maxScore", event.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.1"
                    value={band.points}
                    aria-label={`Band ${index + 1} grade points`}
                    className="h-9 w-24"
                    onChange={(event) => updateBand(index, "points", event.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBands((current) => current.filter((_, i) => i !== index))}
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <CardContent className="flex justify-between border-t">
          <Button variant="outline" onClick={() => setBands((current) => [...current, { ...EMPTY_BAND }])}>
            Add band
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Save grading rules
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
