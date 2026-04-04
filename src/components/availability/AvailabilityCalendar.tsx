import { useState, useEffect, useCallback } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { availabilityService } from '@/services/availability';
import { MusicianAvailability } from '@/types/features';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useTheme } from '@/contexts/ThemeContext';

interface AvailabilityCalendarProps {
  musicianUserId: string;
  editable?: boolean;
  onDateSelect?: (date: Date) => void;
}

export function AvailabilityCalendar({
  musicianUserId,
  editable = false,
  onDateSelect,
}: AvailabilityCalendarProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [availability, setAvailability] = useState<MusicianAvailability[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const loadAvailability = useCallback(async () => {
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(addMonths(currentMonth, 2)), 'yyyy-MM-dd');

    try {
      const data = await availabilityService.getAvailability(musicianUserId, start, end);
      setAvailability(data);
    } catch (error) {
      console.error('Failed to load availability:', error);
    }
  }, [musicianUserId, currentMonth]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  const getDateStatus = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const avail = availability.find((a) => a.date === dateStr);
    return avail?.status || 'unknown';
  };

  const handleDateClick = async (date: Date | undefined) => {
    if (!date) return;

    setSelectedDate(date);

    if (editable) {
      const dateStr = format(date, 'yyyy-MM-dd');
      const currentStatus = getDateStatus(date);
      const newStatus = currentStatus === 'available' ? 'blocked' : 'available';

      try {
        await availabilityService.setAvailability(musicianUserId, dateStr, newStatus);
        await loadAvailability();
      } catch (error) {
        console.error('Failed to update availability:', error);
      }
    } else if (onDateSelect) {
      onDateSelect(date);
    }
  };

  const modifiers = {
    available: (date: Date) => getDateStatus(date) === 'available',
    booked: (date: Date) => getDateStatus(date) === 'booked',
    blocked: (date: Date) => getDateStatus(date) === 'blocked',
  };

  // Use CSS variables for theme-aware colors
  const modifiersStyles = {
    available: { 
      backgroundColor: isDark ? 'hsl(142, 71%, 45%)' : 'hsl(142, 71%, 50%)', 
      color: 'white' 
    },
    booked: { 
      backgroundColor: isDark ? 'hsl(0, 84%, 60%)' : 'hsl(0, 84%, 55%)', 
      color: 'white' 
    },
    blocked: { 
      backgroundColor: isDark ? 'hsl(217, 33%, 45%)' : 'hsl(217, 33%, 50%)', 
      color: 'white' 
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Availability Calendar</span>
          {editable && (
            <Button size="sm" variant="outline" onClick={loadAvailability}>
              Refresh
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateClick}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          modifiers={modifiers}
          modifiersStyles={modifiersStyles}
          className="rounded-md border"
        />

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: modifiersStyles.available.backgroundColor }} />
            <span className="text-sm">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: modifiersStyles.booked.backgroundColor }} />
            <span className="text-sm">Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: modifiersStyles.blocked.backgroundColor }} />
            <span className="text-sm">Blocked</span>
          </div>
        </div>

        {editable && (
          <p className="text-sm text-muted-foreground">Click dates to toggle availability</p>
        )}

        {selectedDate && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">Selected: {format(selectedDate, 'PPP')}</p>
            <Badge variant={getDateStatus(selectedDate) === 'available' ? 'default' : 'secondary'}>
              {getDateStatus(selectedDate)}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
