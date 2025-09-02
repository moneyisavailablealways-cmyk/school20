import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  CalendarIcon, 
  Download, 
  BookOpen, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  DollarSign,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const LibraryReports = () => {
  const [reportType, setReportType] = useState('overview');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  });
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>({});
  const { toast } = useToast();

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    fetchReportData();
  }, [reportType, dateRange]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      // Fetch library items
      const { data: libraryItems } = await supabase
        .from('library_items')
        .select('*');

      // Fetch transactions
      const { data: transactions } = await supabase
        .from('library_transactions')
        .select(`
          *,
          library_items (title, category, item_type),
          profiles (first_name, last_name)
        `)
        .gte('issue_date', fromDate)
        .lte('issue_date', toDate);

      // Fetch fines
      const { data: fines } = await supabase
        .from('library_fines')
        .select('*')
        .gte('created_at', fromDate)
        .lte('created_at', toDate);

      // Fetch reservations
      const { data: reservations } = await supabase
        .from('library_reservations')
        .select('*')
        .gte('reservation_date', fromDate)
        .lte('reservation_date', toDate);

      // Process data for reports
      const processedData = processReportData(libraryItems || [], transactions || [], fines || [], reservations || []);
      setReportData(processedData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch report data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processReportData = (libraryItems: any[], transactions: any[], fines: any[], reservations: any[]) => {
    // Overview stats
    const totalBooks = libraryItems.length;
    const totalTransactions = transactions.length;
    const totalFines = fines.reduce((sum, fine) => sum + fine.amount, 0);
    const totalReservations = reservations.length;
    
    const currentlyBorrowed = transactions.filter(t => !t.return_date).length;
    const overdueItems = transactions.filter(t => t.is_overdue).length;
    const availableBooks = libraryItems.reduce((sum, item) => sum + item.available_copies, 0);

    // Category distribution
    const categoryData = libraryItems.reduce((acc: any, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});

    const categoryChartData = Object.entries(categoryData).map(([category, count]) => ({
      name: category,
      value: count
    }));

    // Monthly transaction trends
    const monthlyData = transactions.reduce((acc: any, transaction) => {
      const month = format(new Date(transaction.issue_date), 'MMM yyyy');
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    const transactionTrendData = Object.entries(monthlyData).map(([month, count]) => ({
      month,
      transactions: count
    }));

    // Popular books
    const bookPopularity = transactions.reduce((acc: any, transaction) => {
      const bookTitle = transaction.library_items?.title;
      if (bookTitle) {
        acc[bookTitle] = (acc[bookTitle] || 0) + 1;
      }
      return acc;
    }, {});

    const popularBooks = Object.entries(bookPopularity)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([title, count]) => ({ title, borrowCount: count }));

    // User activity
    const userActivity = transactions.reduce((acc: any, transaction) => {
      const userName = `${transaction.profiles?.first_name} ${transaction.profiles?.last_name}`;
      acc[userName] = (acc[userName] || 0) + 1;
      return acc;
    }, {});

    const topUsers = Object.entries(userActivity)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([name, count]) => ({ name, borrowCount: count }));

    return {
      overview: {
        totalBooks,
        totalTransactions,
        totalFines,
        totalReservations,
        currentlyBorrowed,
        overdueItems,
        availableBooks
      },
      categoryChartData,
      transactionTrendData,
      popularBooks,
      topUsers,
      recentTransactions: transactions.slice(0, 10),
      overdueList: transactions.filter(t => t.is_overdue),
      finesSummary: {
        totalAmount: totalFines,
        paidAmount: fines.filter(f => f.is_paid).reduce((sum, fine) => sum + fine.amount, 0),
        unpaidCount: fines.filter(f => !f.is_paid && !f.waived_date).length
      }
    };
  };

  const exportReport = () => {
    // Simple CSV export functionality
    const csvContent = generateCSVContent(reportType, reportData);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `library-report-${reportType}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const generateCSVContent = (type: string, data: any) => {
    switch (type) {
      case 'transactions':
        return [
          'Date,Book Title,Borrower,Type,Status',
          ...data.recentTransactions?.map((t: any) => 
            `${t.issue_date},${t.library_items?.title},${t.profiles?.first_name} ${t.profiles?.last_name},${t.transaction_type},${t.return_date ? 'Returned' : 'Borrowed'}`
          ) || []
        ].join('\n');
      case 'popular':
        return [
          'Book Title,Borrow Count',
          ...data.popularBooks?.map((b: any) => `${b.title},${b.borrowCount}`) || []
        ].join('\n');
      default:
        return 'Report data not available for CSV export';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Library Reports</h2>
          <p className="text-muted-foreground">
            Generate and view comprehensive library analytics and reports.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportReport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Report Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Report Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Overview</SelectItem>
                <SelectItem value="transactions">Transactions</SelectItem>
                <SelectItem value="popular">Popular Books</SelectItem>
                <SelectItem value="users">User Activity</SelectItem>
                <SelectItem value="fines">Fines Report</SelectItem>
                <SelectItem value="overdue">Overdue Items</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={(range: any) => range && setDateRange(range)}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Report */}
      {reportType === 'overview' && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Books</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.overview?.totalBooks}</div>
                <p className="text-xs text-muted-foreground">
                  {reportData.overview?.availableBooks} available
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.overview?.totalTransactions}</div>
                <p className="text-xs text-muted-foreground">
                  {reportData.overview?.currentlyBorrowed} currently borrowed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue Items</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.overview?.overdueItems}</div>
                <p className="text-xs text-muted-foreground">
                  Require attention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Fines</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${reportData.overview?.totalFines?.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  {reportData.overview?.totalReservations} reservations
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Collection by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={reportData.categoryChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {reportData.categoryChartData?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Transaction Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={reportData.transactionTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="transactions" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Popular Books Report */}
      {reportType === 'popular' && (
        <Card>
          <CardHeader>
            <CardTitle>Most Popular Books</CardTitle>
            <CardDescription>Books with highest borrow counts</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Book Title</TableHead>
                  <TableHead>Borrow Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.popularBooks?.map((book: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">#{index + 1}</TableCell>
                    <TableCell>{book.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{book.borrowCount}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* User Activity Report */}
      {reportType === 'users' && (
        <Card>
          <CardHeader>
            <CardTitle>Top Library Users</CardTitle>
            <CardDescription>Most active library members</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>User Name</TableHead>
                  <TableHead>Borrow Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.topUsers?.map((user: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">#{index + 1}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{user.borrowCount}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add other report types as needed */}
    </div>
  );
};

export default LibraryReports;