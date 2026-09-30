// SPDX-License-Identifier: AGPL-3.0-or-later
import { PlanwardApp } from "@/components/planward-app";
import { getViewer } from "@/server/access";
import { getCurrentProject } from "@/server/project-repository";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [viewer, project] = await Promise.all([getViewer(), getCurrentProject()]);
  return <PlanwardApp project={project} canEdit={viewer.canEdit} />;
}
