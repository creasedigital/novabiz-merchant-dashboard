import { Popover, PopoverTrigger, PopoverContent } from '@/ui/popover'
import { Button } from '@/ui/button'
import { Switch } from '@/ui/switch'
import { Slider } from '@/ui/slider'
import { Label } from '@/ui/label'
import { useAppStore } from '@/store/useAppStore'
import { Bug, Clock, AlertTriangle, WifiOff, RotateCcw, ShieldAlert } from 'lucide-react'

export function ChaosSimulatorPanel() {
  const { chaos, setChaos, resetChaos } = useAppStore()

  const isChaosActive =
    chaos.forceNextTransferFail ||
    chaos.isSimulatedOffline ||
    chaos.failureRate > 0 ||
    chaos.latencyMs !== 350

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="default"
            size="default"
            className="rounded-full shadow-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold h-11 px-4 gap-2 border-2 border-white dark:border-gray-900 transition-transform hover:scale-105"
            aria-label="Open Evaluator Chaos Simulator"
          >
            <Bug className="h-4 w-4" />
            <span className="text-xs tracking-wide">Chaos Simulator</span>
            {isChaosActive && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          side="top"
          sideOffset={12}
          className="w-80 sm:w-96 p-5 space-y-4 shadow-2xl border-amber-200 dark:border-amber-900/50 bg-white dark:bg-gray-900"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                  Evaluator Chaos Simulator
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Live resilience & optimistic rollback test controls
                </p>
              </div>
            </div>
            {isChaosActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetChaos}
                className="h-7 px-2 text-[11px] text-gray-500 hover:text-amber-600"
                title="Reset to default settings"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {/* Control 1: Force Next Transfer Fail (Optimistic Rollback Trigger) */}
            <div className="p-3 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="chaos-force-transfer-fail"
                  className="text-xs font-bold text-red-900 dark:text-red-200 cursor-pointer"
                >
                  Force Next Transfer to Fail (503)
                </Label>
                <Switch
                  id="chaos-force-transfer-fail"
                  checked={chaos.forceNextTransferFail}
                  onCheckedChange={(val) => setChaos({ forceNextTransferFail: val })}
                  aria-label="Force next transfer to fail"
                />
              </div>
              <p className="text-[11px] text-red-700/80 dark:text-red-300/80 leading-relaxed">
                Deterministically tests optimistic balance deduction and instant rollback with exact kobo restoration.
              </p>
            </div>

            {/* Control 2: Simulated API Latency (0ms - 3000ms) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <Label htmlFor="chaos-latency-slider" className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
                  <Clock className="h-3.5 w-3.5 text-brand-500" />
                  Simulated API Latency
                </Label>
                <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
                  {chaos.latencyMs} ms
                </span>
              </div>
              <Slider
                id="chaos-latency-slider"
                value={[chaos.latencyMs]}
                min={0}
                max={3000}
                step={100}
                onValueChange={([val]) => setChaos({ latencyMs: val ?? 0 })}
                aria-label="Simulated API latency"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>0ms (instant)</span>
                <span>3000ms (slow 2G)</span>
              </div>
            </div>

            {/* Control 3: Random Failure Rate (0% - 100%) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <Label htmlFor="chaos-failure-slider" className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  Random Failure Rate
                </Label>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {Math.round(chaos.failureRate * 100)}%
                </span>
              </div>
              <Slider
                id="chaos-failure-slider"
                value={[chaos.failureRate * 100]}
                min={0}
                max={100}
                step={5}
                onValueChange={([val]) => setChaos({ failureRate: (val ?? 0) / 100 })}
                aria-label="Random failure rate"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>0% (stable)</span>
                <span>100% (down)</span>
              </div>
            </div>

            {/* Control 4: Simulated Offline Mode */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
              <div className="space-y-0.5">
                <Label
                  htmlFor="chaos-offline-mode"
                  className="text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <WifiOff className="h-3.5 w-3.5 text-red-500" />
                  Simulate Offline Mode
                </Label>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Blocks HTTP & shows FirstBank USSD *894# fallback.
                </p>
              </div>
              <Switch
                id="chaos-offline-mode"
                checked={chaos.isSimulatedOffline}
                onCheckedChange={(val) => setChaos({ isSimulatedOffline: val })}
                aria-label="Simulate offline mode"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
