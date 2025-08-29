import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Users, 
  AlertTriangle, 
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

const LibrarianDashboard = () => {
  // Mock data - replace with real data from Supabase
  const stats = {
    totalBooks: 2450,
    availableBooks: 2180,
    borrowedBooks: 270,
    overdueBooks: 23,
    reservations: 15,
    newBooksThisMonth: 45
  };

  const recentTransactions = [
    {
      id: '1',
      bookTitle: 'To Kill a Mockingbird',
      borrower: 'Alice Johnson',
      type: 'borrow',
      date: '2024-01-15',
      dueDate: '2024-01-29'
    },
    {
      id: '2',
      bookTitle: 'The Great Gatsby', 
      borrower: 'Bob Smith',
      type: 'return',
      date: '2024-01-15',
      dueDate: '2024-01-14',
      isOverdue: true
    },
    {
      id: '3',
      bookTitle: '1984',
      borrower: 'Carol Davis',
      type: 'borrow',
      date: '2024-01-14',
      dueDate: '2024-01-28'
    }
  ];

  const overdueItems = [
    {
      id: '1',
      bookTitle: 'Pride and Prejudice',
      borrower: 'David Wilson',
      dueDate: '2024-01-10',
      daysOverdue: 5,
      fine: 2.50
    },
    {
      id: '2',
      bookTitle: 'Lord of the Flies',
      borrower: 'Eva Brown', 
      dueDate: '2024-01-08',
      daysOverdue: 7,
      fine: 3.50
    }
  ];

  const popularBooks = [
    { title: 'Harry Potter Series', borrowCount: 45 },
    { title: 'The Hunger Games', borrowCount: 38 },
    { title: 'Wonder', borrowCount: 32 },
    { title: 'Diary of a Wimpy Kid', borrowCount: 28 },
    { title: 'Percy Jackson Series', borrowCount: 25 }
  ];

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Library Dashboard</h2>
        <p className="text-muted-foreground">
          Manage your library resources and track borrowing activities.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Books</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBooks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.newBooksThisMonth} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Currently Borrowed</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.borrowedBooks}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.borrowedBooks / stats.totalBooks) * 100)}% of collection
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overdueBooks}</div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reservations</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.reservations}</div>
            <p className="text-xs text-muted-foreground">
              Active reservations
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
            <CardDescription>Latest borrowing and return activities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {transaction.type === 'borrow' ? (
                      <BookOpen className="h-4 w-4 text-primary" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{transaction.bookTitle}</h4>
                    <p className="text-sm text-muted-foreground">{transaction.borrower}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={
                    transaction.type === 'borrow' ? 'default' : 
                    transaction.isOverdue ? 'destructive' : 'secondary'
                  }>
                    {transaction.type}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">{transaction.date}</p>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full">
              View All Transactions
            </Button>
          </CardContent>
        </Card>

        {/* Overdue Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Overdue Items
            </CardTitle>
            <CardDescription>Items requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {overdueItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-destructive/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                    <XCircle className="h-4 w-4 text-destructive" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{item.bookTitle}</h4>
                    <p className="text-sm text-muted-foreground">{item.borrower}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-destructive">
                    {item.daysOverdue} days overdue
                  </p>
                  <p className="text-sm text-muted-foreground">Fine: ${item.fine}</p>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full">
              <AlertTriangle className="mr-2 h-4 w-4" />
              View All Overdue
            </Button>
          </CardContent>
        </Card>

        {/* Popular Books */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Popular Books
            </CardTitle>
            <CardDescription>Most borrowed books this month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {popularBooks.map((book, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <span className="font-medium text-foreground">{book.title}</span>
                </div>
                <Badge variant="secondary">{book.borrowCount} borrows</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common library management tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <BookOpen className="mr-2 h-4 w-4" />
              Add New Book
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Users className="mr-2 h-4 w-4" />
              Issue Book
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <CheckCircle className="mr-2 h-4 w-4" />
              Return Book
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Manage Fines
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LibrarianDashboard;