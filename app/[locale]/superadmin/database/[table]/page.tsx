import { DatabaseTableView } from '@/components/super-admin/DatabaseTableView';

export default async function DatabaseTablePage({
  params,
}: {
  params: Promise<{ table: string }>;
}) {
  const { table } = await params;
  return <DatabaseTableView table={table} />;
}
