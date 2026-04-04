import type { Meta, StoryObj } from '@storybook/react';
import { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardIcon,
  CardProgress,
  CardActions
} from './card';
import { DollarSign, ArrowRight } from 'lucide-react';
import { Button } from './button';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'glass', 'hover', 'gradient', 'outlined', 'gradient-border'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: (args) => (
    <Card {...args} className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card Description</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card Content goes here. You can put anything inside the content area.</p>
      </CardContent>
      <CardFooter>
        <Button variant="outline">Cancel</Button>
        <Button className="ml-auto">Submit</Button>
      </CardFooter>
    </Card>
  ),
};

export const Glass: Story = {
  args: {
    variant: 'glass',
  },
  render: (args) => (
    <div className="p-8 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl">
      <Card {...args} className="w-[350px]">
        <CardHeader>
          <CardTitle>Glass Card</CardTitle>
          <CardDescription>With backdrop blur effect</CardDescription>
        </CardHeader>
        <CardContent>
          <p>This card uses glassmorphism effects for a modern look.</p>
        </CardContent>
      </Card>
    </div>
  ),
};

export const GradientBorder: Story = {
  args: {
    variant: 'gradient-border',
  },
  render: (args) => (
    <Card {...args} className="w-[350px]">
      <CardHeader>
        <CardTitle>Gradient Border</CardTitle>
        <CardDescription>Hover to see the effect</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This card has a subtle gradient border that glows on hover.</p>
      </CardContent>
    </Card>
  ),
};

export const DashboardCard: Story = {
  render: () => (
    <Card variant="gradient-border" className="w-[300px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
        <CardIcon icon={DollarSign} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">GHS 45,231.89</div>
        <CardProgress value={75} variant="success" showLabel label="+20.1% from last month" />
      </CardContent>
      <CardActions>
        <Button variant="ghost" size="sm" className="w-full">
          View Report <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardActions>
    </Card>
  ),
};

export const Interactive: Story = {
  args: {
    variant: 'hover',
    tooltip: 'Click to view details',
  },
  render: (args) => (
    <Card {...args} className="w-[350px]" onClick={() => alert('Card clicked!')}>
      <CardHeader>
        <CardTitle>Interactive Card</CardTitle>
        <CardDescription>Click me or hover me</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This card has ripple effects and scale-up animation on hover/click.</p>
      </CardContent>
    </Card>
  ),
};
