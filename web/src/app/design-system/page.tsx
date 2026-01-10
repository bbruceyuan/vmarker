/**
 * [INPUT]: 依赖 @/components/ui/*
 * [OUTPUT]: 对外提供 DesignSystemPage 页面
 * [POS]: 设计系统展示页，展示所有可用组件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Check, Info } from "lucide-react";

export default function DesignSystemPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-2">Design System</h1>
      <p className="text-muted-foreground mb-8">
        vmarker 设计系统组件库 - 基于 shadcn/ui + Amethyst Haze 主题
      </p>

      <div className="space-y-12">
        {/* Colors */}
        <Section title="Colors" description="设计系统颜色变量">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <ColorSwatch name="Primary" className="bg-primary" />
            <ColorSwatch name="Secondary" className="bg-secondary" />
            <ColorSwatch name="Accent" className="bg-accent" />
            <ColorSwatch name="Muted" className="bg-muted" />
            <ColorSwatch name="Destructive" className="bg-destructive" />
            <ColorSwatch name="Background" className="bg-background border" />
            <ColorSwatch name="Card" className="bg-card border" />
            <ColorSwatch name="Popover" className="bg-popover border" />
          </div>
        </Section>

        {/* Buttons */}
        <Section title="Buttons" description="按钮组件变体">
          <div className="flex flex-wrap gap-4">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
          <div className="flex flex-wrap gap-4 mt-4">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
          </div>
        </Section>

        {/* Badges */}
        <Section title="Badges" description="标签组件变体">
          <div className="flex flex-wrap gap-4">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
        </Section>

        {/* Form Elements */}
        <Section title="Form Elements" description="表单组件">
          <div className="grid gap-6 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Enter your email" />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="terms" />
              <Label htmlFor="terms">Accept terms and conditions</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="notifications" />
              <Label htmlFor="notifications">Enable notifications</Label>
            </div>
          </div>
        </Section>

        {/* Cards */}
        <Section title="Cards" description="卡片组件">
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>Card Title</CardTitle>
                <CardDescription>Card description goes here</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Card content</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Another Card</CardTitle>
                <CardDescription>With different content</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Action</Button>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* Tabs */}
        <Section title="Tabs" description="选项卡组件">
          <Tabs defaultValue="tab1" className="max-w-md">
            <TabsList>
              <TabsTrigger value="tab1">Account</TabsTrigger>
              <TabsTrigger value="tab2">Password</TabsTrigger>
              <TabsTrigger value="tab3">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="tab1" className="p-4">
              Account settings content
            </TabsContent>
            <TabsContent value="tab2" className="p-4">
              Password settings content
            </TabsContent>
            <TabsContent value="tab3" className="p-4">
              General settings content
            </TabsContent>
          </Tabs>
        </Section>

        {/* Alerts */}
        <Section title="Alerts" description="提示组件">
          <div className="space-y-4 max-w-lg">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Info</AlertTitle>
              <AlertDescription>
                This is an informational alert message.
              </AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Something went wrong. Please try again.
              </AlertDescription>
            </Alert>
          </div>
        </Section>

        {/* Progress */}
        <Section title="Progress" description="进度条组件">
          <div className="space-y-4 max-w-md">
            <Progress value={33} />
            <Progress value={66} />
            <Progress value={100} />
          </div>
        </Section>

        {/* Skeleton */}
        <Section title="Skeleton" description="骨架屏组件">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-2xl font-semibold mb-1">{title}</h2>
      <p className="text-muted-foreground mb-4">{description}</p>
      <Separator className="mb-6" />
      {children}
    </section>
  );
}

function ColorSwatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="space-y-2">
      <div className={`h-16 rounded-lg ${className}`} />
      <p className="text-sm font-medium">{name}</p>
    </div>
  );
}
