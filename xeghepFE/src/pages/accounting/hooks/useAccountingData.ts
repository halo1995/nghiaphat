import { useQuery } from '@tanstack/react-query';
import {
    getRevenueSummary,
    getDeposits,
    getPayments,
    getCustomerAdvances,
    getDriverExpenseAdvances,
    CustomerAdvanceStatus,
    DriverExpenseStatus,
} from '@/data/accounting';
import { getDrivers } from '@/data/drivers';

interface UseAccountingDataProps {
    isAuthenticated: boolean;
    isAccountant: boolean;
    dateFrom?: Date;
    dateTo?: Date;
    summaryDateFrom?: Date;
    summaryDateTo?: Date;
    selectedDriverFilter?: string;
    customerStatusFilter?: 'all' | CustomerAdvanceStatus;
    driverStatusFilter?: 'all' | DriverExpenseStatus;
}

export const useAccountingData = ({
    isAuthenticated,
    isAccountant,
    dateFrom,
    dateTo,
    summaryDateFrom,
    summaryDateTo,
    selectedDriverFilter,
    customerStatusFilter,
    driverStatusFilter,
}: UseAccountingDataProps) => {
    const enabled = isAuthenticated && isAccountant;

    const driversQ = useQuery({
        queryKey: ['drivers'],
        queryFn: getDrivers,
        enabled,
    });

    const summaryQ = useQuery({
        queryKey: ['revenue-summary', summaryDateFrom, summaryDateTo],
        queryFn: () => getRevenueSummary(summaryDateFrom, summaryDateTo),
        enabled,
    });

    const depositsQ = useQuery({
        queryKey: ['deposits'],
        queryFn: getDeposits,
        enabled,
    });

    const paymentsQ = useQuery({
        queryKey: ['payments'],
        queryFn: getPayments,
        enabled,
    });

    const customerAdvancesQ = useQuery({
        queryKey: ['customer-advances', customerStatusFilter],
        queryFn: () =>
            getCustomerAdvances(
                customerStatusFilter === 'all' ? undefined : { status: customerStatusFilter },
            ),
        enabled,
    });

    const driverAdvancesQ = useQuery({
        queryKey: ['driver-advances', driverStatusFilter, selectedDriverFilter],
        queryFn: () =>
            getDriverExpenseAdvances({
                status: driverStatusFilter === 'all' ? undefined : driverStatusFilter,
                driverId: selectedDriverFilter || undefined,
            }),
        enabled,
    });

    // Client-side date filtering helper
    const isWithinDateRange = (dateStr: string, from?: Date, to?: Date): boolean => {
        if (!from && !to) return true;
        const date = new Date(dateStr);
        if (from && date < from) return false;
        if (to) {
            const endOfDay = new Date(to);
            endOfDay.setHours(23, 59, 59, 999);
            if (date > endOfDay) return false;
        }
        return true;
    };

    // Filter data by date range
    const filteredDeposits = depositsQ.data?.filter(deposit =>
        isWithinDateRange(deposit.createdAt, dateFrom, dateTo)
    ) || [];

    const filteredPayments = paymentsQ.data?.filter(payment =>
        isWithinDateRange(payment.collectedAt, dateFrom, dateTo)
    ) || [];

    const filteredCustomerAdvances = customerAdvancesQ.data?.filter(advance =>
        isWithinDateRange(advance.collectedAt, dateFrom, dateTo)
    ) || [];

    return {
        drivers: driversQ.data || [],
        summary: summaryQ.data,
        deposits: filteredDeposits,
        payments: filteredPayments,
        customerAdvances: filteredCustomerAdvances,
        driverAdvances: driverAdvancesQ.data || [],
        isLoading:
            driversQ.isLoading ||
            summaryQ.isLoading ||
            depositsQ.isLoading ||
            paymentsQ.isLoading ||
            customerAdvancesQ.isLoading ||
            driverAdvancesQ.isLoading,
        isError:
            driversQ.isError ||
            summaryQ.isError ||
            depositsQ.isError ||
            paymentsQ.isError ||
            customerAdvancesQ.isError ||
            driverAdvancesQ.isError,
    };
};
