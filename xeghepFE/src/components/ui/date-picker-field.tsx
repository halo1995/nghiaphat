import * as React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const parseLocalDateString = (value: string) => {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
};

const formatLocalDateString = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

type DatePickerFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  allowClear?: boolean;
};

export const DatePickerField: React.FC<DatePickerFieldProps> = ({
  id,
  value,
  onChange,
  placeholder = 'Chọn ngày',
  className,
  disabled,
  required,
  allowClear = false,
}) => {
  const [open, setOpen] = React.useState(false);

  const selectedDate = React.useMemo(() => parseLocalDateString(value), [value]);

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    onChange(formatLocalDateString(date));
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setOpen(false);
  };

  const displayLabel = selectedDate
    ? format(selectedDate, "EEEE, dd/MM/yyyy", { locale: vi })
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !selectedDate && 'text-muted-foreground',
            className,
          )}
          disabled={disabled}
          aria-required={required}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarComponent
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          locale={vi}
          initialFocus
        />
        {allowClear && value && (
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-center text-sm text-red-600 hover:text-red-700 border-t"
            onClick={handleClear}
          >
            Xóa ngày
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
};
