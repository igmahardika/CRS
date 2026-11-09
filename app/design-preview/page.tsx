'use client';

import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Database,
  Download,
  FileText,
  Filter,
  HardDrive,
  Info,
  MoreVertical,
  Network,
  Plus,
  RefreshCw,
  Search,
  Server,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
  Checkbox,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  SegmentedControl,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Skeleton,
  EmptyState,
  PageHeader,
  Spinner,
  FormField,
  StatCard,
} from '@/components/ui';

export default function DesignPreviewPage() {
  const [direction, setDirection] = useState<'NORMAL' | 'REVERSED'>('NORMAL');
  const [engine, setEngine] = useState<'MRTG' | 'PRTG'>('MRTG');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [inputValue, setInputValue] = useState('01.2180.1124');
  const [checkState, setCheckState] = useState(true);

  const handleDeleteItem = async () => {
    setIsDeleting(true);
    await new Promise((r) => setTimeout(r, 900));
    setIsDeleting(false);
    setIsConfirmOpen(false);
    toast.success('Customer record deleted successfully');
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-8 space-y-10">
      {/* 1. Page Header */}
      <PageHeader
        title="Design System & Component Showcase"
        badge={
          <Badge variant="soft">
            Section A5 Authority
          </Badge>
        }
        actions={
          <>
            <Button
              variant="secondary"
              size="md"
              onClick={() => toast.info('System tokens verified across all components')}
            >
              Verify Tokens
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => toast.success('Active primary button triggered successfully')}
            >
              Export PDF
            </Button>
          </>
        }
      />

      {/* 2. Color Palette & Semantic Tokens */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-heading font-semibold text-slate-900">
            Color Tokens (Single Nexa Orange Accent & Semantic Status)
          </h2>
          <span className="text-[12px] text-slate-500 font-sans">
            WCAG AA Contrast Compliant (min 4.5:1)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex flex-col justify-between h-24">
            <div className="h-6 w-full rounded-md bg-[#F16614]" />
            <div>
              <p className="text-[12px] font-medium text-slate-900">Brand Logo</p>
              <p className="text-[11px] text-slate-500 ">#F16614</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex flex-col justify-between h-24">
            <div className="h-6 w-full rounded-md bg-[#EA580C]" />
            <div>
              <p className="text-[12px] font-medium text-slate-900">Primary Solid</p>
              <p className="text-[11px] text-slate-500 ">#EA580C</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex flex-col justify-between h-24">
            <div className="h-6 w-full rounded-md bg-[#C2410C]" />
            <div>
              <p className="text-[12px] font-medium text-slate-900">Strong / Hover</p>
              <p className="text-[11px] text-slate-500 ">#C2410C</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex flex-col justify-between h-24">
            <div className="h-6 w-full rounded-md bg-[#FFF7ED] border border-orange-200" />
            <div>
              <p className="text-[12px] font-medium text-slate-900">Soft Pill Nav</p>
              <p className="text-[11px] text-slate-500 ">#FFF7ED</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex flex-col justify-between h-24">
            <div className="h-6 w-full rounded-md bg-emerald-600" />
            <div>
              <p className="text-[12px] font-medium text-slate-900">Success Status</p>
              <p className="text-[11px] text-slate-500 ">#16A34A</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex flex-col justify-between h-24">
            <div className="h-6 w-full rounded-md bg-red-600" />
            <div>
              <p className="text-[12px] font-medium text-slate-900">Destructive Status</p>
              <p className="text-[11px] text-slate-500 ">#DC2626</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex flex-col justify-between h-24">
            <div className="h-6 w-full rounded-md bg-amber-600" />
            <div>
              <p className="text-[12px] font-medium text-slate-900">Warning Status</p>
              <p className="text-[11px] text-slate-500 ">#D97706</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex flex-col justify-between h-24">
            <div className="h-6 w-full rounded-md bg-blue-600" />
            <div>
              <p className="text-[12px] font-medium text-slate-900">Info Status</p>
              <p className="text-[11px] text-slate-500 ">#2563EB</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Typography Scale */}
      <section className="space-y-4">
        <h2 className="text-[16px] font-heading font-semibold text-slate-900">
          Typography Scale (Strict 12 / 13 / 14 / 16 / 20 / 24)
        </h2>
        <div className="border border-slate-200 bg-white rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-baseline justify-between border-b border-slate-100 pb-3">
            <span className="text-[12px] font-medium text-slate-500 uppercase tracking-wider w-40">
              Page Title (24/600)
            </span>
            <span className="text-[24px] font-heading font-semibold text-slate-900 flex-1">
              Poppins 24px SemiBold - Network SLA Reporting
            </span>
          </div>
          <div className="flex items-baseline justify-between border-b border-slate-100 pb-3">
            <span className="text-[12px] font-medium text-slate-500 uppercase tracking-wider w-40">
              Section Title (16/600)
            </span>
            <span className="text-[16px] font-heading font-semibold text-slate-900 flex-1">
              Poppins 16px SemiBold - Customer Bandwidth Summary
            </span>
          </div>
          <div className="flex items-baseline justify-between border-b border-slate-100 pb-3">
            <span className="text-[12px] font-medium text-slate-500 uppercase tracking-wider w-40">
              Subheading (14/500)
            </span>
            <span className="text-[14px] font-heading font-medium text-slate-800 flex-1">
              Poppins 14px Medium - Interface Port Diagnostics
            </span>
          </div>
          <div className="flex items-baseline justify-between border-b border-slate-100 pb-3">
            <span className="text-[12px] font-medium text-slate-500 uppercase tracking-wider w-40">
              Control Label (13/500)
            </span>
            <span className="text-[13px] font-sans font-medium text-slate-700 flex-1">
              Inter 13px Medium - Target SLA Percentage
            </span>
          </div>
          <div className="flex items-baseline justify-between border-b border-slate-100 pb-3">
            <span className="text-[12px] font-medium text-slate-500 uppercase tracking-wider w-40">
              Body & Table (13/400)
            </span>
            <span className="text-[13px] font-sans text-slate-600 flex-1">
              Inter 13px Regular - High availability met contractual threshold of 99.50% during October 2026.
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] font-medium text-slate-500 uppercase tracking-wider w-40">
              Table Header (12/500)
            </span>
            <span className="text-[12px] font-sans font-medium uppercase tracking-wider text-slate-500 flex-1">
              Inter 12px Medium Uppercase - SERVICE IDENTIFIER & TARGET SLA
            </span>
          </div>
        </div>
      </section>

      {/* 4. Unified Stat Cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-heading font-semibold text-slate-900">
            Stat Cards (Rule A5: Single Uniform Slate-100 Chip Style)
          </h2>
          <span className="text-[12px] text-slate-500">No decorative icon colors</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Reports"
            value="1,248"
            icon={FileText}
            subtext="Across 18 enterprise clients"
          />
          <StatCard
            label="Average Availability"
            value="99.98%"
            icon={Activity}
            badge={<Badge variant="success" dot>Met</Badge>}
            subtext="Target SLA: 99.50%"
          />
          <StatCard
            label="Active Customers"
            value="342"
            icon={Users}
            subtext="12 added this month"
          />
          <StatCard
            label="Monitored Nodes"
            value="1,840"
            icon={Server}
            subtext="Cacti & PRTG synchronized"
          />
        </div>
      </section>

      {/* 5. Button Matrix (4 Variants x 2 Sizes x States) */}
      <section className="space-y-4">
        <h2 className="text-[16px] font-heading font-semibold text-slate-900">
          Button Matrix (Rule A6: Exactly 4 Variants, sm & md)
        </h2>
        <div className="border border-slate-200 bg-white rounded-lg p-6 shadow-sm space-y-6">
          {/* Primary Buttons */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-[13px] font-medium text-slate-500 w-28">Primary</span>
            <Button variant="primary" size="md">
              <Download className="w-4 h-4 mr-1.5" />
              Primary md (36px)
            </Button>
            <Button variant="primary" size="sm">
              Primary sm (32px)
            </Button>
            <Button variant="primary" size="md" loading>
              Loading State
            </Button>
            <Button variant="primary" size="md" disabled>
              Disabled
            </Button>
          </div>

          {/* Secondary Outline Buttons */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-[13px] font-medium text-slate-500 w-28">Secondary</span>
            <Button variant="secondary" size="md">
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Secondary md (36px)
            </Button>
            <Button variant="secondary" size="sm">
              Secondary sm (32px)
            </Button>
            <Button variant="secondary" size="md" loading>
              Loading State
            </Button>
            <Button variant="secondary" size="md" disabled>
              Disabled
            </Button>
          </div>

          {/* Ghost Buttons */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-[13px] font-medium text-slate-500 w-28">Ghost</span>
            <Button variant="ghost" size="md">
              Ghost md (36px)
            </Button>
            <Button variant="ghost" size="sm">
              Ghost sm (32px)
            </Button>
            <Button variant="ghost" size="md" disabled>
              Disabled
            </Button>
          </div>

          {/* Destructive Buttons */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-[13px] font-medium text-slate-500 w-28">Destructive</span>
            <Button variant="destructive" size="md">
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete md (36px)
            </Button>
            <Button variant="destructive" size="sm">
              Delete sm (32px)
            </Button>
            <Button variant="destructive" size="md" loading>
              Deleting
            </Button>
            <Button variant="destructive" size="md" disabled>
              Disabled
            </Button>
          </div>

          {/* Icon Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100">
            <span className="text-[13px] font-medium text-slate-500 w-28">Icon Only</span>
            <Button variant="secondary" size="icon-md" aria-label="Search">
              <Search className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="icon-sm" aria-label="Filter">
              <Filter className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon-md" aria-label="More actions">
              <MoreVertical className="w-4 h-4" />
            </Button>
            <Button variant="destructive" size="icon-md" aria-label="Delete item">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* 6. Form Controls & Validation */}
      <section className="space-y-4">
        <h2 className="text-[16px] font-heading font-semibold text-slate-900">
          Form Controls & Inline Validation
        </h2>
        <div className="border border-slate-200 bg-white rounded-lg p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField label="Customer Identifier" required hint="Alphanumeric ID code">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="e.g. 01.2180.1124"
            />
          </FormField>

          <FormField label="Service Bandwidth" error="Bandwidth capacity cannot be 0 Mbps">
            <Input defaultValue="0 Mbps" error />
          </FormField>

          <FormField label="Monitoring Engine">
            <Select defaultValue="MRTG">
              <SelectTrigger>
                <SelectValue placeholder="Select Engine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MRTG">MRTG / Cacti Server</SelectItem>
                <SelectItem value="PRTG">PRTG Network Monitor</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <div className="md:col-span-2">
            <FormField label="Root Cause Analysis" hint="Max 250 characters">
              <Textarea placeholder="Describe the incident, downtime impact, and resolution actions taken..." />
            </FormField>
          </div>

          <div className="flex flex-col justify-center space-y-4">
            <Label className="text-slate-700">Options & Preferences</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="preview-check"
                checked={checkState}
                onCheckedChange={(c) => setCheckState(!!c)}
              />
              <label
                htmlFor="preview-check"
                className="text-[13px] font-sans text-slate-700 select-none cursor-pointer"
              >
                Auto-generate document number
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="preview-check-disabled" disabled checked />
              <label
                htmlFor="preview-check-disabled"
                className="text-[13px] font-sans text-slate-400 select-none"
              >
                Locked configuration (admin only)
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Segmented Controls, Badges & Tabs */}
      <section className="space-y-4">
        <h2 className="text-[16px] font-heading font-semibold text-slate-900">
          Segmented Controls, Semantic Badges & Tabs
        </h2>
        <div className="border border-slate-200 bg-white rounded-lg p-6 shadow-sm space-y-6">
          {/* Segmented Controls */}
          <div className="flex flex-wrap items-center gap-6">
            <div className="space-y-1.5">
              <Label>Traffic Direction</Label>
              <div>
                <SegmentedControl
                  value={direction}
                  onChange={(val) => setDirection(val as 'NORMAL' | 'REVERSED')}
                  options={[
                    { value: 'NORMAL', label: 'NORMAL' },
                    { value: 'REVERSED', label: 'REVERSED' },
                  ]}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Graph Engine</Label>
              <div>
                <SegmentedControl
                  value={engine}
                  onChange={(val) => setEngine(val as 'MRTG' | 'PRTG')}
                  options={[
                    { value: 'MRTG', label: 'MRTG (Cacti)', badge: 142 },
                    { value: 'PRTG', label: 'PRTG Sensor', badge: 28 },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Semantic Badges */}
          <div className="space-y-2 pt-4 border-t border-slate-100">
            <Label>Semantic Badges (No decorative color variations)</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="neutral">Neutral Slate</Badge>
              <Badge variant="success" dot>SLA Met (100.00%)</Badge>
              <Badge variant="destructive" dot>SLA Breached (98.40%)</Badge>
              <Badge variant="warning" dot>Downtime Logged</Badge>
              <Badge variant="info">PRTG Sensor</Badge>
              <Badge variant="soft">Nexa Active Tab</Badge>
            </div>
          </div>

          {/* Tabs */}
          <div className="space-y-2 pt-4 border-t border-slate-100">
            <Label>Section Tabs</Label>
            <Tabs defaultValue="cacti">
              <TabsList>
                <TabsTrigger value="cacti">Cacti Integration</TabsTrigger>
                <TabsTrigger value="prtg">PRTG Integration</TabsTrigger>
                <TabsTrigger value="branding">Report Templates</TabsTrigger>
              </TabsList>
              <TabsContent value="cacti" className="text-[13px] text-slate-600 p-3 bg-slate-50 rounded-lg border border-slate-200">
                Cacti base endpoint: <code className="text-slate-800">http://cacti.internal.net</code>
              </TabsContent>
              <TabsContent value="prtg" className="text-[13px] text-slate-600 p-3 bg-slate-50 rounded-lg border border-slate-200">
                PRTG base endpoint: <code className="text-slate-800">http://prtg.internal.net</code>
              </TabsContent>
              <TabsContent value="branding" className="text-[13px] text-slate-600 p-3 bg-slate-50 rounded-lg border border-slate-200">
                A4 Cover Template: <code className="text-slate-800">cover_mrtg.png</code>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>

      {/* 8. Data Table Component */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-heading font-semibold text-slate-900">
            Data Table (Rule A5 & Phase 4: 44px Row Height, Sticky Header, Tabular Figures)
          </h2>
          <span className="text-[12px] text-slate-500">Kebab dropdown actions, zero raw button/input tags</span>
        </div>

        <div className="border border-slate-200 bg-white rounded-lg shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer Name</TableHead>
                <TableHead>Customer ID</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Sources</TableHead>
                <TableHead className="text-right">Target SLA</TableHead>
                <TableHead className="text-right">Availability</TableHead>
                <TableHead className="w-12 text-center"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium text-slate-900">
                  RSJ. Dr. Soeharto Heerdjan
                </TableCell>
                <TableCell className="text-slate-600 text-[12px]">
                  01.2180.1124
                </TableCell>
                <TableCell>Prime 300 Mbps</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[12px] text-slate-700">Cacti: 2180</span>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">99.50%</TableCell>
                <TableCell className="text-right">
                  <Badge variant="success" dot className="tabular-nums">
                    100.00%
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="Actions">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toast.info('Edit selected customer')}>
                        Edit Customer
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.info('Generating report preview')}>
                        Generate Report
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setIsConfirmOpen(true)}
                      >
                        Delete Customer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="font-medium text-slate-900">
                  Linknet - Site BFI
                </TableCell>
                <TableCell className="text-slate-600 text-[12px]">
                  01.1496.0624
                </TableCell>
                <TableCell>Metronet 100 Mbps</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span className="text-[12px] text-slate-700">PRTG: 1496</span>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">99.50%</TableCell>
                <TableCell className="text-right">
                  <Badge variant="success" dot className="tabular-nums">
                    99.85%
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="Actions">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toast.info('Edit selected customer')}>
                        Edit Customer
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.info('Generating report preview')}>
                        Generate Report
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setIsConfirmOpen(true)}
                      >
                        Delete Customer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="font-medium text-slate-900">
                  Uniqlo Queen City Mall
                </TableCell>
                <TableCell className="text-slate-600 text-[12px]">
                  01.3320.0924
                </TableCell>
                <TableCell>Prime 200 Mbps</TableCell>
                <TableCell>
                  <span className="text-slate-400 text-[12px]">Not set</span>
                </TableCell>
                <TableCell className="text-right tabular-nums">99.50%</TableCell>
                <TableCell className="text-right">
                  <Badge variant="destructive" dot className="tabular-nums">
                    98.20%
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="Actions">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toast.info('Edit selected customer')}>
                        Edit Customer
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.info('Generating report preview')}>
                        Generate Report
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setIsConfirmOpen(true)}
                      >
                        Delete Customer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      {/* 9. Dialogs & Feedback */}
      <section className="space-y-4">
        <h2 className="text-[16px] font-heading font-semibold text-slate-900">
          Dialogs & Feedback (Rule Phase 2: Sonner Toasts & ConfirmDialog)
        </h2>
        <div className="border border-slate-200 bg-white rounded-lg p-6 shadow-sm flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => setIsDialogOpen(true)}
          >
            Open Standard Dialog
          </Button>

          <Button
            variant="destructive"
            onClick={() => setIsConfirmOpen(true)}
          >
            Open ConfirmDialog
          </Button>

          <Button
            variant="ghost"
            onClick={() => toast.success('Customer SLA report generated successfully')}
          >
            Toast Success
          </Button>

          <Button
            variant="ghost"
            onClick={() => toast.error('Connection timed out to Cacti endpoint')}
          >
            Toast Error
          </Button>

          <Button
            variant="ghost"
            onClick={() => toast.warning('Target SLA calculation is below threshold')}
          >
            Toast Warning
          </Button>
        </div>
      </section>

      {/* 10. Skeletons & Empty State */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3 border border-slate-200 bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-[16px] font-heading font-semibold text-slate-900 mb-2">
            Loading Skeleton Placeholder
          </h3>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-9 w-full" />
          <div className="grid grid-cols-3 gap-2 pt-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>

        <div>
          <EmptyState
            icon={HardDrive}
            title="No downtime incidents recorded"
            description="All monitored network interfaces operated normally without interruption during this period."
            actionLabel="Add Incident Log"
            onAction={() => toast.info('Add downtime incident')}
          />
        </div>
      </section>

      {/* Modals placed at bottom of page */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Service Endpoint</DialogTitle>
            <DialogDescription>
              Enter credentials and base URL for Cacti or PRTG monitoring services.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <FormField label="Endpoint URL" required>
              <Input defaultValue="http://cacti.internal.net" />
            </FormField>
            <FormField label="API Secret Key">
              <Input type="password" defaultValue="secret_key_sample" />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsDialogOpen(false);
                toast.success('Configuration saved');
              }}
            >
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title="Delete Customer Record"
        description={
          <>
            Are you sure you want to delete customer <strong className="text-slate-900">RSJ. Dr. Soeharto Heerdjan (01.2180.1124)</strong>? This action cannot be undone.
          </>
        }
        confirmText="Delete Customer"
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDeleteItem}
      />
    </div>
  );
}
