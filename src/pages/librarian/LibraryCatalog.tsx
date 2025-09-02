import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  BookOpen, 
  Edit, 
  Trash2,
  Filter,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LibraryCatalog = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Mock data - replace with real data from Supabase
  const catalogItems = [
    {
      id: '1',
      title: 'To Kill a Mockingbird',
      author: 'Harper Lee',
      isbn: '978-0-06-112008-4',
      barcode: 'LIB001234',
      category: 'Fiction',
      itemType: 'book',
      totalCopies: 5,
      availableCopies: 3,
      location: 'A-12-03',
      publishedYear: 1960
    },
    {
      id: '2',
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      isbn: '978-0-7432-7356-5',
      barcode: 'LIB001235',
      category: 'Fiction',
      itemType: 'book',
      totalCopies: 4,
      availableCopies: 1,
      location: 'A-12-04',
      publishedYear: 1925
    },
    {
      id: '3',
      title: 'Mathematics Grade 10',
      author: 'John Smith',
      isbn: '978-1-234-56789-0',
      barcode: 'LIB001236',
      category: 'Textbook',
      itemType: 'book',
      totalCopies: 25,
      availableCopies: 18,
      location: 'T-05-01',
      publishedYear: 2023
    },
    {
      id: '4',
      title: 'National Geographic Kids',
      author: 'Various',
      isbn: '',
      barcode: 'LIB001237',
      category: 'Magazine',
      itemType: 'magazine',
      totalCopies: 1,
      availableCopies: 1,
      location: 'M-01-01',
      publishedYear: 2024
    }
  ];

  const categories = ['all', 'Fiction', 'Textbook', 'Reference', 'Magazine', 'DVD'];
  const itemTypes = ['all', 'book', 'ebook', 'magazine', 'dvd', 'material'];

  const getAvailabilityBadge = (available: number, total: number) => {
    const percentage = (available / total) * 100;
    if (percentage === 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (percentage < 25) return <Badge variant="secondary">Low Stock</Badge>;
    return <Badge variant="default">Available</Badge>;
  };

  const filteredItems = catalogItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.isbn.includes(searchQuery) ||
                         item.barcode.includes(searchQuery);
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Library Catalog</h2>
          <p className="text-muted-foreground">
            Manage your library's collection of books and resources.
          </p>
        </div>
        <Button onClick={() => {
          // This would open an add item dialog - functionality can be expanded
          console.log('Add new item clicked');
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Item
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, author, ISBN, or barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Catalog Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredItems.length} of {catalogItems.length} items
          </p>
        </div>

        <div className="grid gap-4">
          {filteredItems.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-16 bg-primary/10 rounded flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                        <p className="text-muted-foreground">{item.author}</p>
                      </div>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>ISBN: {item.isbn || 'N/A'}</span>
                        <span>Barcode: {item.barcode}</span>
                        <span>Location: {item.location}</span>
                        <span>Year: {item.publishedYear}</span>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline">{item.category}</Badge>
                        <Badge variant="outline">{item.itemType}</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Availability</p>
                      <p className="font-medium">
                        {item.availableCopies} of {item.totalCopies} available
                      </p>
                      {getAvailabilityBadge(item.availableCopies, item.totalCopies)}
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => console.log('Edit item:', item.id)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Item
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.location.href = `/librarian/transactions?barcode=${item.barcode}`}>
                          <BookOpen className="mr-2 h-4 w-4" />
                          Issue Book
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => console.log('View history:', item.id)}>
                          <BookOpen className="mr-2 h-4 w-4" />
                          View History
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => console.log('Delete item:', item.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Item
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No items found</h3>
              <p className="text-muted-foreground text-center">
                No library items match your search criteria. Try adjusting your filters or search terms.
              </p>
              <Button className="mt-4" onClick={() => console.log('Add new item from empty state')}>
                <Plus className="mr-2 h-4 w-4" />
                Add New Item
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LibraryCatalog;