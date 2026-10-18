import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/ui/dialog'
import { Switch } from '@/ui/switch'
import { Slider } from '@/ui/slider'
import { Label } from '@/ui/label'
import { Button } from '@/ui/button'
import { useAppStore } from '@/store/useAppStore'
import { AlertTriangle, WifiOff, Clock, Bug, RotateCcw } from 'lucide-react'

export interface NetworkChaosDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NetworkChaosDialog({ open, onOpenChange }: NetworkChaosDialogProps) {
  const { chaos, setChaos, resetChaos } = useAppStore()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-amber-500" />
            <DialogTitle>Network Chaos Simulator</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Test low-connectivity resilience, latency, 503 errors, and optimistic UI rollback.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-3">
          {/* Latency Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <Label htmlFor="chaos-latency" className="flex items-center gap-1.5 font-medium">
                <Clock className="h-3.5 w-3.5 text-gray-500" />
                Network Latency
              </Label>
              <span className="font-mono font-semibold text-brand-600 dark:text-brand-400">
                {chaos.latencyMs} ms
              </span>
            </div>
            <Slider
              id="chaos-latency"
              value={[chaos.latencyMs]}
              min={0}
              max={2000}
              step={50}
              onValueChange={([val]) => setChaos({ latencyMs: val ?? 0 })}
            />
            <p className="text-[11px] text-gray-400">
              Simulates Nigerian edge latency (0ms–2000ms).
            </p>
          </div>

          {/* Failure Rate Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <Label htmlFor="chaos-failure-rate" className="flex items-center gap-1.5 font-medium">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                Random Failure Rate
              </Label>
              <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                {Math.round(chaos.failureRate * 100)}%
              </span>
            </div>
            <Slider
              id="chaos-failure-rate"
              value={[chaos.failureRate * 100]}
              min={0}
              max={100}
              step={5}
              onValueChange={([val]) => setChaos({ failureRate: (val ?? 0) / 100 })}
            />
            <p className="text-[11px] text-gray-400">
              Randomly returns HTTP 503 to trigger exponential backoff retry.
            </p>
          </div>

          {/* Force Next Transfer Fail Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60">
            <div className="space-y-0.5">
              <Label htmlFor="chaos-force-fail" className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                Force Next Transfer Fail (503)
              </Label>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Deterministically tests optimistic rollback without affecting other calls.
              </p>
            </div>
            <Switch
              id="chaos-force-fail"
              checked={chaos.forceNextTransferFail}
              onCheckedChange={(val) => setChaos({ forceNextTransferFail: val })}
              aria-label="Force next transfer to fail"
            />
          </div>

          {/* Simulate Offline Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60">
            <div className="space-y-0.5">
              <Label htmlFor="chaos-offline" className="text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                <WifiOff className="h-3.5 w-3.5 text-red-500" />
                Simulate Offline State
              </Label>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Blocks network requests & surfaces the *894# USSD emergency banner.
              </p>
            </div>
            <Switch
              id="chaos-offline"
              checked={chaos.isSimulatedOffline}
              onCheckedChange={(val) => setChaos({ isSimulatedOffline: val })}
              aria-label="Simulate offline mode"
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetChaos}
            className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset Defaults
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
