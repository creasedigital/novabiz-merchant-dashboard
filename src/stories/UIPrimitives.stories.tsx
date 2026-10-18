import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { Button } from '@/ui/button'
import { Badge } from '@/ui/badge'
import { Input } from '@/ui/input'
import { Label } from '@/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/select'
import { Alert, AlertTitle, AlertDescription } from '@/ui/alert'
import { Skeleton } from '@/ui/skeleton'
import { Switch } from '@/ui/switch'
import { Slider } from '@/ui/slider'
import { Card, CardHeader, CardContent } from '@/ui/card'
import { AlertCircle, CheckCircle2, Info, AlertTriangle, Send } from 'lucide-react'

const meta: Meta = {
  title: 'UI Primitives/Overview',
  parameters: {
    layout: 'padded',
  },
}

export default meta

export const Buttons: StoryObj = {
  render: () => (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-bold mb-2">Button Variants (WCAG AA Focus Rings)</h3>
        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="default">Default (Brand)</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold mb-2">Button Sizes & Icons</h3>
        <div className="flex flex-wrap gap-3 items-center">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button size="default">
            <Send className="h-4 w-4 mr-2" />
            With Icon
          </Button>
          <Button disabled>Disabled</Button>
        </div>
      </div>
    </div>
  ),
}

export const Badges: StoryObj = {
  render: () => (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-bold mb-2">Transaction Status Semantic Badges</h3>
        <div className="flex flex-wrap gap-3 items-center">
          <Badge variant="successful">Successful</Badge>
          <Badge variant="pending">Pending</Badge>
          <Badge variant="failed">Failed</Badge>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold mb-2">KYC Tier Badges</h3>
        <div className="flex flex-wrap gap-3 items-center">
          <Badge variant="tier1">Tier 1 (₦50k/day)</Badge>
          <Badge variant="tier2">Tier 2 (₦300k/day)</Badge>
          <Badge variant="tier3">Tier 3 (Unlimited)</Badge>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold mb-2">General Badges</h3>
        <div className="flex flex-wrap gap-3 items-center">
          <Badge variant="default">Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="failed">Failed</Badge>
        </div>
      </div>
    </div>
  ),
}

export const FormControls: StoryObj = {
  render: () => {
    const [switchVal, setSwitchVal] = React.useState(false)
    const [sliderVal, setSliderVal] = React.useState([350])

    return (
      <div className="space-y-6 max-w-md">
        <div className="space-y-2">
          <Label htmlFor="input-standard">10-Digit NUBAN Account</Label>
          <Input id="input-standard" placeholder="0123456789" maxLength={10} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="input-error">Transfer Amount (₦)</Label>
          <Input
            id="input-error"
            hasError={true}
            value="50"
            readOnly
            aria-describedby="amount-err"
          />
          <p id="amount-err" role="alert" className="text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Minimum transfer amount is ₦100.00
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bank-dropdown">Destination Bank</Label>
          <Select defaultValue="011">
            <SelectTrigger id="bank-dropdown">
              <SelectValue placeholder="Select Bank" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="011">First Bank of Nigeria</SelectItem>
              <SelectItem value="058">Guaranty Trust Bank</SelectItem>
              <SelectItem value="057">Zenith Bank</SelectItem>
              <SelectItem value="033">United Bank for Africa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between p-3 border rounded-lg">
          <Label htmlFor="switch-demo" className="cursor-pointer">
            Enable Feature
          </Label>
          <Switch id="switch-demo" checked={switchVal} onCheckedChange={setSwitchVal} />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <Label htmlFor="slider-demo">Latency Simulator</Label>
            <span className="font-mono font-bold">{sliderVal[0]} ms</span>
          </div>
          <Slider
            id="slider-demo"
            value={sliderVal}
            onValueChange={setSliderVal}
            min={0}
            max={3000}
            step={50}
          />
        </div>
      </div>
    )
  },
}

export const Alerts: StoryObj = {
  render: () => (
    <div className="space-y-4 max-w-lg">
      <Alert variant="default">
        <Info className="h-4 w-4" />
        <AlertTitle>NIBSS NIP Advisory</AlertTitle>
        <AlertDescription>
          Inter-bank instant settlement is active with sub-second finality.
        </AlertDescription>
      </Alert>

      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertTitle>Transfer Failed — Balance Restored</AlertTitle>
        <AlertDescription>
          Simulated 503 Gateway Timeout. ₦2,000.00 (+ fee) was restored to your balance.
        </AlertDescription>
      </Alert>

      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertTitle>Poor Connectivity Detected</AlertTitle>
        <AlertDescription>
          Retrying automatically... For urgent transfers without data, dial *894#.
        </AlertDescription>
      </Alert>

      <Alert variant="success">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle>Transfer Sent</AlertTitle>
        <AlertDescription>
          Transfer of ₦2,000.00 to Adaeze Okonkwo completed successfully.
        </AlertDescription>
      </Alert>
    </div>
  ),
}

export const Skeletons: StoryObj = {
  render: () => (
    <div className="space-y-6 max-w-xl">
      <h3 className="text-lg font-bold">Explicit Loading States</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-8 w-36" />
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
        <Skeleton className="h-12 w-full rounded-md" />
      </div>
    </div>
  ),
}
