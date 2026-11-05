"use client";

import { useRouter } from "next/navigation";
import { NativeSelect } from "./plan-ui";

/** Switches the action-plans view to another survey: basePath/surveyId + suffix. */
export function SurveySwitcher({
  surveys,
  currentId,
  basePath,
  suffix = "",
  label,
}: {
  surveys: { id: string; name: string }[];
  currentId: string;
  basePath: string;
  suffix?: string;
  label: string;
}) {
  const router = useRouter();
  if (surveys.length < 2) return null;
  return (
    <NativeSelect
      aria-label={label}
      className="h-9 w-72"
      value={currentId}
      onChange={(e) => router.push(`${basePath}/${e.target.value}${suffix}`)}
    >
      {surveys.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </NativeSelect>
  );
}
