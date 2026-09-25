import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const FINANCE_ROLES = ['admin', 'accountant', 'sales_manager'];

/**
 * GET /api/reports/sales — streams the daily_sales view as a CSV download.
 * Linked from /admin/reports's "Export CSV" button (spec §69). Role is
 * re-checked here independently of the page that links to it, since this
 * route is reachable directly by URL.
 */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !FINANCE_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
  }

  const { data: rows, error } = await supabase
    .from('daily_sales')
    .select('sale_date, order_count, revenue, cod_revenue, upi_revenue')
    .order('sale_date', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Could not generate the report.' }, { status: 500 });
  }

  const header = 'Date,Orders,Revenue,COD Revenue,UPI Revenue';
  const body = (rows ?? [])
    .map((r) => [r.sale_date, r.order_count, r.revenue, r.cod_revenue, r.upi_revenue].join(','))
    .join('\n');
  const csv = `${header}\n${body}\n`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="pandurang-milk-sales-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
