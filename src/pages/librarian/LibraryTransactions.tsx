import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Search, BookOpen, CheckCircle, Loader2, AlertCircle, Filter, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface LibraryTransaction {
  id: string;
  library_item_id: string;
  borrower_id: string;
  transaction_type: string;
  issue_date: string;
  due_date: string;
  return_date?: string;
  is_overdue: boolean;
  fine_amount: number;
  notes?: string;
  library_items?: {
    title: string;
    author: string;
    barcode: string;
    item_type: string;
    subject: string;
  };
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface BookInfo {
  id: string;
  title: string;
  author: string;
  item_type: string;
  subject: string;
  available_copies: number;
}

interface BorrowerInfo {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  class_name?: string;
  stream_name?: string;
  student_id?: string;
}

const LibraryTransactions = () => {
  const [transactions, setTransactions] = useState<LibraryTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<LibraryTransaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isNewTransactionOpen, setIsNewTransactionOpen] = useState(false);
  const { toast } = useToast();

  // Advanced filters
  const [authorFilter, setAuthorFilter] = useState('');
  const [titleFilter, setTitleFilter] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [borrowerNameFilter, setBorrowerNameFilter] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [streamFilter, setStreamFilter] = useState('all');

  // Filter options from database
  const [itemTypes, setItemTypes] = useState<string[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [streams, setStreams] = useState<{ id: string; name: string; class_id: string }[]>([]);

  // Dropdown options for form
  const [allTitles, setAllTitles] = useState<{ id: string; title: string; author: string; item_type: string; subject: string; available_copies: number }[]>([]);
  const [allAuthors, setAllAuthors] = useState<string[]>([]);
  const [allSubjects, setAllSubjects] = useState<string[]>([]);

  // New transaction form state
  const [barcode, setBarcode] = useState('');
  const [bookInfo, setBookInfo] = useState<BookInfo | null>(null);
  const [bookLoading, setBookLoading] = useState(false);
  const [bookError, setBookError] = useState('');
  
  // Book search filters for form - using popovers
  const [formTitleFilter, setFormTitleFilter] = useState('');
  const [formAuthorFilter, setFormAuthorFilter] = useState('');
  const [formItemTypeFilter, setFormItemTypeFilter] = useState('');
  const [formSubjectFilter, setFormSubjectFilter] = useState('');
  const [selectedBook, setSelectedBook] = useState<BookInfo | null>(null);
  
  // Popover open states
  const [titlePopoverOpen, setTitlePopoverOpen] = useState(false);
  const [authorPopoverOpen, setAuthorPopoverOpen] = useState(false);
  const [itemTypePopoverOpen, setItemTypePopoverOpen] = useState(false);
  const [subjectPopoverOpen, setSubjectPopoverOpen] = useState(false);
  
  const [borrowerSearch, setBorrowerSearch] = useState('');
  const [borrowerResults, setBorrowerResults] = useState<BorrowerInfo[]>([]);
  const [selectedBorrower, setSelectedBorrower] = useState<BorrowerInfo | null>(null);
  const [borrowerLoading, setBorrowerLoading] = useState(false);
  const [borrowerPopoverOpen, setBorrowerPopoverOpen] = useState(false);
  const [formClassFilter, setFormClassFilter] = useState('all');
  
  const [transactionType, setTransactionType] = useState('borrow');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [fineAmount, setFineAmount] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    fetchTransactions();
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchQuery, statusFilter, authorFilter, titleFilter, itemTypeFilter, subjectFilter, borrowerNameFilter, classFilter, streamFilter]);

  const fetchFilterOptions = async () => {
    // Fetch all library items for dropdowns
    const { data: items } = await supabase
      .from('library_items')
      .select('id, title, author, item_type, subject, available_copies')
      .eq('is_active', true)
      .order('title');
    
    if (items) {
      setAllTitles(items);
      const uniqueTypes = [...new Set(items.map(i => i.item_type).filter(Boolean))];
      setItemTypes(uniqueTypes);
      const uniqueAuthors = [...new Set(items.map(i => i.author).filter(Boolean))] as string[];
      setAllAuthors(uniqueAuthors.sort());
      const uniqueSubjects = [...new Set(items.map(i => i.subject).filter(Boolean))] as string[];
      setAllSubjects(uniqueSubjects.sort());
    }

    // Fetch classes
    const { data: classData } = await supabase
      .from('classes')
      .select('id, name')
      .order('name');
    
    if (classData) setClasses(classData);

    // Fetch streams
    const { data: streamData } = await supabase
      .from('streams')
      .select('id, name, class_id')
      .order('name');
    
    if (streamData) setStreams(streamData);
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('library_transactions')
        .select(`
          *,
          library_items (title, author, barcode, item_type, subject),
          profiles!library_transactions_borrower_id_fkey (first_name, last_name, email)
        `)
        .order('issue_date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = transactions;

    // Text search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.library_items?.title?.toLowerCase().includes(query) ||
        t.library_items?.barcode?.toLowerCase().includes(query) ||
        t.profiles?.first_name?.toLowerCase().includes(query) ||
        t.profiles?.last_name?.toLowerCase().includes(query) ||
        t.profiles?.email?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => {
        switch (statusFilter) {
          case 'borrowed': return t.transaction_type === 'borrow' && !t.return_date;
          case 'returned': return t.return_date !== null;
          case 'overdue': return t.is_overdue;
          default: return true;
        }
      });
    }

    // Book filters
    if (authorFilter) {
      filtered = filtered.filter(t => 
        t.library_items?.author?.toLowerCase().includes(authorFilter.toLowerCase())
      );
    }
    if (titleFilter) {
      filtered = filtered.filter(t => 
        t.library_items?.title?.toLowerCase().includes(titleFilter.toLowerCase())
      );
    }
    if (itemTypeFilter !== 'all') {
      filtered = filtered.filter(t => t.library_items?.item_type === itemTypeFilter);
    }
    if (subjectFilter) {
      filtered = filtered.filter(t => 
        t.library_items?.subject?.toLowerCase().includes(subjectFilter.toLowerCase())
      );
    }

    // Borrower filters
    if (borrowerNameFilter) {
      const name = borrowerNameFilter.toLowerCase();
      filtered = filtered.filter(t => 
        t.profiles?.first_name?.toLowerCase().includes(name) ||
        t.profiles?.last_name?.toLowerCase().includes(name)
      );
    }

    setFilteredTransactions(filtered);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setAuthorFilter('');
    setTitleFilter('');
    setItemTypeFilter('all');
    setSubjectFilter('');
    setBorrowerNameFilter('');
    setClassFilter('all');
    setStreamFilter('all');
  };

  // Fetch book by barcode
  const fetchBookByBarcode = useCallback(async (code: string) => {
    if (!code.trim()) {
      setBookInfo(null);
      setBookError('');
      return;
    }

    setBookLoading(true);
    setBookError('');
    setBookInfo(null);

    try {
      const { data, error } = await supabase
        .from('library_items')
        .select('id, title, author, item_type, subject, available_copies')
        .eq('barcode', code.trim())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setBookError('Book not found. Please check the barcode.');
        return;
      }

      if (data.available_copies <= 0) {
        setBookError('No copies available for borrowing.');
        return;
      }

      setBookInfo(data);
    } catch (err) {
      setBookError('Failed to fetch book information.');
    } finally {
      setBookLoading(false);
    }
  }, []);

  // Debounced barcode lookup
  useEffect(() => {
    const timer = setTimeout(() => {
      if (barcode.length >= 3) {
        fetchBookByBarcode(barcode);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [barcode, fetchBookByBarcode]);

  // Filter functions for dropdowns
  const filteredTitles = allTitles.filter(book => 
    book.available_copies > 0 &&
    (!formTitleFilter || book.title.toLowerCase().includes(formTitleFilter.toLowerCase())) &&
    (!formAuthorFilter || book.author?.toLowerCase().includes(formAuthorFilter.toLowerCase())) &&
    (!formItemTypeFilter || book.item_type === formItemTypeFilter) &&
    (!formSubjectFilter || book.subject?.toLowerCase().includes(formSubjectFilter.toLowerCase()))
  );

  const filteredAuthors = allAuthors.filter(author =>
    author.toLowerCase().includes(formAuthorFilter.toLowerCase())
  );

  const filteredSubjects = allSubjects.filter(subject =>
    subject.toLowerCase().includes(formSubjectFilter.toLowerCase())
  );

  const filteredItemTypes = itemTypes.filter(type =>
    type.toLowerCase().includes(formItemTypeFilter.toLowerCase())
  );


  // Search borrowers with class filter
  const searchBorrowers = useCallback(async (query: string, classId?: string) => {
    if (!query.trim() || query.length < 2) {
      setBorrowerResults([]);
      return;
    }

    setBorrowerLoading(true);

    try {
      // Fetch profiles with student enrollment info
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .eq('is_active', true)
        .limit(50);

      if (error) throw error;

      if (!profiles || profiles.length === 0) {
        setBorrowerResults([]);
        return;
      }

      // Fetch student enrollment info for these profiles
      const profileIds = profiles.map(p => p.id);
      
      // Get student to profile mapping with student_id
      const { data: studentMappings } = await supabase
        .from('students')
        .select('id, profile_id, student_id')
        .in('profile_id', profileIds);

      const profileToStudent = new Map(studentMappings?.map(s => [s.profile_id, { id: s.id, student_id: s.student_id }]) || []);
      const studentIds = studentMappings?.map(s => s.id) || [];

      // Fetch enrollments for students, optionally filtered by class
      let enrollmentQuery = supabase
        .from('student_enrollments')
        .select(`
          student_id,
          class_id,
          classes (id, name),
          streams (id, name)
        `)
        .in('student_id', studentIds)
        .eq('status', 'active');

      if (classId && classId !== 'all') {
        enrollmentQuery = enrollmentQuery.eq('class_id', classId);
      }

      const { data: enrollments } = await enrollmentQuery;

      const studentToEnrollment = new Map(enrollments?.map(e => [e.student_id, e]) || []);
      const enrolledStudentIds = new Set(enrollments?.map(e => e.student_id) || []);

      // Map results with class/stream info, filter by class if specified
      let results: BorrowerInfo[] = profiles
        .filter(p => {
          if (classId && classId !== 'all') {
            const studentData = profileToStudent.get(p.id);
            return studentData && enrolledStudentIds.has(studentData.id);
          }
          return true;
        })
        .map(p => {
          const studentData = profileToStudent.get(p.id);
          const enrollment = studentData ? studentToEnrollment.get(studentData.id) : null;
          
          return {
            id: p.id,
            first_name: p.first_name,
            last_name: p.last_name,
            email: p.email,
            class_name: enrollment?.classes?.name,
            stream_name: enrollment?.streams?.name,
            student_id: studentData?.student_id
          };
        });

      setBorrowerResults(results);
    } catch (err) {
      console.error('Error searching borrowers:', err);
      setBorrowerResults([]);
    } finally {
      setBorrowerLoading(false);
    }
  }, []);

  // Debounced borrower search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchBorrowers(borrowerSearch, formClassFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [borrowerSearch, formClassFilter, searchBorrowers]);

  const handleNewTransaction = async () => {
    const bookToUse = selectedBook || bookInfo;
    if (!bookToUse || !selectedBorrower || !dueDate) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    setCreateLoading(true);

    try {
      const { error } = await supabase
        .from('library_transactions')
        .insert([{
          library_item_id: bookToUse.id,
          borrower_id: selectedBorrower.id,
          transaction_type: transactionType,
          due_date: new Date(dueDate).toISOString(),
          fine_amount: fineAmount ? parseFloat(fineAmount) : 0,
          notes: notes || null
        }]);

      if (error) throw error;

      toast({
        description: "Transaction created successfully",
      });

      // Reset form
      setIsNewTransactionOpen(false);
      setBarcode('');
      setBookInfo(null);
      setBookError('');
      setFormTitleFilter('');
      setFormAuthorFilter('');
      setFormItemTypeFilter('');
      setFormSubjectFilter('');
      setSelectedBook(null);
      setBorrowerSearch('');
      setSelectedBorrower(null);
      setBorrowerResults([]);
      setFormClassFilter('all');
      setTransactionType('borrow');
      setDueDate('');
      setFineAmount('');
      setNotes('');
      
      fetchTransactions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create transaction",
        variant: "destructive",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleReturn = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from('library_transactions')
        .update({
          return_date: new Date().toISOString(),
          is_overdue: false
        })
        .eq('id', transactionId);

      if (error) throw error;

      toast({
        description: "Book returned successfully",
      });

      fetchTransactions();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to return book",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (transaction: LibraryTransaction) => {
    if (transaction.return_date) {
      return <Badge variant="secondary">Returned</Badge>;
    }
    if (transaction.is_overdue) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    return <Badge variant="default">Borrowed</Badge>;
  };

  const isFormValid = (bookInfo || selectedBook) && selectedBorrower && dueDate && transactionType;

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
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Library Transactions</h2>
          <p className="text-muted-foreground">
            Manage book borrowing and return transactions.
          </p>
        </div>
        <Dialog open={isNewTransactionOpen} onOpenChange={setIsNewTransactionOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Transaction</DialogTitle>
              <DialogDescription>
                Search for a book and select a borrower to create a transaction.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              {/* Book Search Section */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-foreground">Book Information</h4>
                
                {/* Book search filters in grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Book Title Dropdown */}
                  <div className="space-y-2">
                    <Label>Book Title</Label>
                    <Popover open={titlePopoverOpen} onOpenChange={setTitlePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between font-normal"
                        >
                          <span className={cn("truncate", !formTitleFilter && "text-muted-foreground")}>
                            {formTitleFilter || "Select title..."}
                          </span>
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput 
                            placeholder="Type to filter titles..." 
                            value={formTitleFilter}
                            onValueChange={setFormTitleFilter}
                          />
                          <CommandList>
                            {filteredTitles.length === 0 && (
                              <CommandEmpty>No books found.</CommandEmpty>
                            )}
                            <CommandGroup className="max-h-64 overflow-y-auto">
                              {filteredTitles.slice(0, 50).map((book) => (
                                <CommandItem
                                  key={book.id}
                                  value={book.id}
                                  onSelect={() => {
                                    setSelectedBook(book);
                                    setFormTitleFilter(book.title);
                                    setFormAuthorFilter(book.author || '');
                                    setFormItemTypeFilter(book.item_type || '');
                                    setFormSubjectFilter(book.subject || '');
                                    setTitlePopoverOpen(false);
                                    setBarcode('');
                                    setBookInfo(null);
                                  }}
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">{book.title}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {book.author || 'Unknown'} • {book.available_copies} available
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Author Dropdown */}
                  <div className="space-y-2">
                    <Label>Author</Label>
                    <Popover open={authorPopoverOpen} onOpenChange={setAuthorPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between font-normal"
                        >
                          <span className={cn("truncate", !formAuthorFilter && "text-muted-foreground")}>
                            {formAuthorFilter || "Select author..."}
                          </span>
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput 
                            placeholder="Type to filter authors..." 
                            value={formAuthorFilter}
                            onValueChange={setFormAuthorFilter}
                          />
                          <CommandList>
                            {filteredAuthors.length === 0 && (
                              <CommandEmpty>No authors found.</CommandEmpty>
                            )}
                            <CommandGroup className="max-h-64 overflow-y-auto">
                              {filteredAuthors.slice(0, 50).map((author) => (
                                <CommandItem
                                  key={author}
                                  value={author}
                                  onSelect={() => {
                                    setFormAuthorFilter(author);
                                    setAuthorPopoverOpen(false);
                                  }}
                                >
                                  {author}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Item Type Dropdown */}
                  <div className="space-y-2">
                    <Label>Item Type</Label>
                    <Popover open={itemTypePopoverOpen} onOpenChange={setItemTypePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between font-normal"
                        >
                          <span className={cn("truncate", !formItemTypeFilter && "text-muted-foreground")}>
                            {formItemTypeFilter || "All Types"}
                          </span>
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput 
                            placeholder="Type to filter..." 
                            value={formItemTypeFilter}
                            onValueChange={setFormItemTypeFilter}
                          />
                          <CommandList>
                            <CommandGroup>
                              <CommandItem
                                value=""
                                onSelect={() => {
                                  setFormItemTypeFilter('');
                                  setItemTypePopoverOpen(false);
                                }}
                              >
                                All Types
                              </CommandItem>
                              {filteredItemTypes.map((type) => (
                                <CommandItem
                                  key={type}
                                  value={type}
                                  onSelect={() => {
                                    setFormItemTypeFilter(type);
                                    setItemTypePopoverOpen(false);
                                  }}
                                >
                                  {type}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Subject Dropdown */}
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Popover open={subjectPopoverOpen} onOpenChange={setSubjectPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between font-normal"
                        >
                          <span className={cn("truncate", !formSubjectFilter && "text-muted-foreground")}>
                            {formSubjectFilter || "Select subject..."}
                          </span>
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[250px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput 
                            placeholder="Type to filter subjects..." 
                            value={formSubjectFilter}
                            onValueChange={setFormSubjectFilter}
                          />
                          <CommandList>
                            {filteredSubjects.length === 0 && (
                              <CommandEmpty>No subjects found.</CommandEmpty>
                            )}
                            <CommandGroup className="max-h-64 overflow-y-auto">
                              {filteredSubjects.slice(0, 50).map((subject) => (
                                <CommandItem
                                  key={subject}
                                  value={subject}
                                  onSelect={() => {
                                    setFormSubjectFilter(subject);
                                    setSubjectPopoverOpen(false);
                                  }}
                                >
                                  {subject}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Barcode Scanner */}
                  <div className="space-y-2">
                    <Label>Or Scan Barcode</Label>
                    <div className="relative">
                      <Input
                        value={barcode}
                        onChange={(e) => {
                          setBarcode(e.target.value);
                          setSelectedBook(null);
                        }}
                        placeholder="Enter or scan barcode"
                      />
                      {bookLoading && (
                        <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    {bookError && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        {bookError}
                      </div>
                    )}
                  </div>
                </div>

                {/* Filtered Books Results (when filters applied but no book selected) */}
                {!selectedBook && !bookInfo && (formTitleFilter || formAuthorFilter || formItemTypeFilter || formSubjectFilter) && filteredTitles.length > 0 && (
                  <div className="border rounded-md max-h-48 overflow-y-auto bg-background">
                    <div className="p-2 border-b bg-muted/50">
                      <span className="text-sm text-muted-foreground">{filteredTitles.length} book(s) match your filters</span>
                    </div>
                    {filteredTitles.slice(0, 10).map((book) => (
                      <div
                        key={book.id}
                        className="p-3 cursor-pointer hover:bg-muted border-b last:border-b-0"
                        onClick={() => {
                          setSelectedBook(book);
                          setFormTitleFilter(book.title);
                          setFormAuthorFilter(book.author || '');
                          setFormItemTypeFilter(book.item_type || '');
                          setFormSubjectFilter(book.subject || '');
                          setBarcode('');
                          setBookInfo(null);
                        }}
                      >
                        <div className="font-medium">{book.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {book.author || 'Unknown Author'} • {book.item_type} • {book.subject || 'No subject'}
                          <span className="ml-2 text-primary">({book.available_copies} available)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Book Display */}
                {(selectedBook || bookInfo) && (
                  <Card className="bg-muted/50">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-primary" />
                          <span className="font-semibold">Selected Book</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedBook(null);
                            setBookInfo(null);
                            setBarcode('');
                            setFormTitleFilter('');
                            setFormAuthorFilter('');
                            setFormItemTypeFilter('');
                            setFormSubjectFilter('');
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Title:</span>
                          <p className="font-medium">{(selectedBook || bookInfo)?.title}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Author:</span>
                          <p className="font-medium">{(selectedBook || bookInfo)?.author || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Type:</span>
                          <p className="font-medium">{(selectedBook || bookInfo)?.item_type || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Subject:</span>
                          <p className="font-medium">{(selectedBook || bookInfo)?.subject || 'N/A'}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="mt-2">
                        {(selectedBook || bookInfo)?.available_copies} copies available
                      </Badge>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Borrower Search Section */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-foreground">Borrower Information</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Borrower Name *</Label>
                    <Popover open={borrowerPopoverOpen} onOpenChange={setBorrowerPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={borrowerPopoverOpen}
                          className="w-full justify-between font-normal"
                        >
                          {selectedBorrower ? (
                            <span className="truncate">
                              {selectedBorrower.first_name} {selectedBorrower.last_name}
                              {selectedBorrower.student_id && (
                                <span className="text-muted-foreground ml-1">
                                  ({selectedBorrower.student_id})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Filter by borrower name...</span>
                          )}
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput 
                            placeholder="Search by name..." 
                            value={borrowerSearch}
                            onValueChange={setBorrowerSearch}
                          />
                          <CommandList>
                            {borrowerLoading && (
                              <div className="flex items-center justify-center p-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                              </div>
                            )}
                            {!borrowerLoading && borrowerSearch.length >= 2 && borrowerResults.length === 0 && (
                              <CommandEmpty>No borrowers found.</CommandEmpty>
                            )}
                            {!borrowerLoading && borrowerResults.length > 0 && (
                              <CommandGroup>
                                {borrowerResults.map((borrower) => (
                                  <CommandItem
                                    key={borrower.id}
                                    value={borrower.id}
                                    onSelect={() => {
                                      setSelectedBorrower(borrower);
                                      setBorrowerPopoverOpen(false);
                                    }}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {borrower.first_name} {borrower.last_name}
                                        {borrower.student_id && (
                                          <span className="text-muted-foreground font-normal ml-1">
                                            ({borrower.student_id})
                                          </span>
                                        )}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {borrower.class_name ? (
                                          <>
                                            {borrower.class_name}
                                            {borrower.stream_name && ` | ${borrower.stream_name}`}
                                          </>
                                        ) : (
                                          borrower.email
                                        )}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <Select value={formClassFilter} onValueChange={setFormClassFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Classes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Selected Borrower Display */}
                {selectedBorrower && (
                  <Card className="bg-muted/50">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">
                            {selectedBorrower.first_name} {selectedBorrower.last_name}
                          </span>
                          {selectedBorrower.class_name && (
                            <span className="text-sm text-muted-foreground ml-2">
                              — {selectedBorrower.class_name}
                              {selectedBorrower.stream_name && ` | ${selectedBorrower.stream_name}`}
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedBorrower(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Transaction Details Section */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-foreground">Transaction Details</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="transaction_type">Transaction Type *</Label>
                    <Select value={transactionType} onValueChange={setTransactionType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="borrow">Borrow</SelectItem>
                        <SelectItem value="return">Return</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due_date">Due Date *</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fine_amount">Fine Amount (Optional)</Label>
                    <Input
                      id="fine_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={fineAmount}
                      onChange={(e) => setFineAmount(e.target.value)}
                      placeholder="Enter fine if overdue"
                    />
                    <p className="text-xs text-muted-foreground">
                      Add a fine if the student exceeded the due date before returning
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Input
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional notes"
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={handleNewTransaction} 
                disabled={!isFormValid || createLoading}
              >
                {createLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Transaction
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filter Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick search and status */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Quick search by book title, barcode, or borrower..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="borrowed">Currently Borrowed</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Filters Accordion */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="advanced-filters">
              <AccordionTrigger className="text-sm">Advanced Filters</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                  {/* Book Filters */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Book Title</Label>
                    <Input
                      placeholder="Filter by title..."
                      value={titleFilter}
                      onChange={(e) => setTitleFilter(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Author</Label>
                    <Input
                      placeholder="Filter by author..."
                      value={authorFilter}
                      onChange={(e) => setAuthorFilter(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Item Type</Label>
                    <Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {itemTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Subject</Label>
                    <Input
                      placeholder="Filter by subject..."
                      value={subjectFilter}
                      onChange={(e) => setSubjectFilter(e.target.value)}
                    />
                  </div>

                  {/* Borrower Filters */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Borrower Name</Label>
                    <Input
                      placeholder="Filter by borrower name..."
                      value={borrowerNameFilter}
                      onChange={(e) => setBorrowerNameFilter(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Class</Label>
                    <Select value={classFilter} onValueChange={setClassFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All classes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    <X className="mr-2 h-4 w-4" />
                    Clear Filters
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Showing {filteredTransactions.length} transaction(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book</TableHead>
                <TableHead>Borrower</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Return Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{transaction.library_items?.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.library_items?.author && `by ${transaction.library_items.author}`}
                      </p>
                      <div className="flex gap-1 mt-1">
                        {transaction.library_items?.item_type && (
                          <Badge variant="outline" className="text-xs">
                            {transaction.library_items.item_type}
                          </Badge>
                        )}
                        {transaction.library_items?.subject && (
                          <Badge variant="outline" className="text-xs">
                            {transaction.library_items.subject}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {transaction.profiles?.first_name} {transaction.profiles?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">{transaction.profiles?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{transaction.transaction_type}</Badge>
                  </TableCell>
                  <TableCell>{format(new Date(transaction.issue_date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{format(new Date(transaction.due_date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    {transaction.return_date 
                      ? format(new Date(transaction.return_date), 'MMM dd, yyyy')
                      : '-'
                    }
                  </TableCell>
                  <TableCell>{getStatusBadge(transaction)}</TableCell>
                  <TableCell>
                    {!transaction.return_date && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleReturn(transaction.id)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Return
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredTransactions.length === 0 && (
            <div className="text-center py-8">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No transactions found</h3>
              <p className="text-muted-foreground">
                No transactions match your search criteria.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LibraryTransactions;
