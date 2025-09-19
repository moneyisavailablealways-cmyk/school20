import React, { useState, useEffect } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import AddLibraryItemDialog from '@/components/AddLibraryItemDialog';
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
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Load catalog items from Supabase
  const loadCatalogItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('library_items')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setCatalogItems(data || []);
    } catch (error) {
      console.error('Error loading catalog items:', error);
      toast({
        title: 'Error',
        description: 'Failed to load catalog items',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalogItems();
  }, []);

  // Get unique categories from the actual data
  const categories = ['all', ...new Set(catalogItems.map(item => item.category))];


  const getAvailabilityBadge = (available: number, total: number) => {
    const percentage = (available / total) * 100;
    if (percentage === 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (percentage < 25) return <Badge variant="secondary">Low Stock</Badge>;
    return <Badge variant="default">Available</Badge>;
  };

  const filteredItems = catalogItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (item.author && item.author.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         (item.isbn && item.isbn.includes(searchQuery)) ||
                         (item.barcode && item.barcode.includes(searchQuery));
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
        <Button onClick={() => setShowAddDialog(true)}>
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
            {loading ? 'Loading...' : `Showing ${filteredItems.length} of ${catalogItems.length} items`}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading catalog items...</div>
        ) : (
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
                        <p className="text-muted-foreground">{item.author || 'Unknown Author'}</p>
                      </div>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>ISBN: {item.isbn || 'N/A'}</span>
                        <span>Barcode: {item.barcode || 'N/A'}</span>
                        <span>Location: {item.location || 'N/A'}</span>
                        <span>Year: {item.publication_year || 'N/A'}</span>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline">{item.category}</Badge>
                        <Badge variant="outline">{item.item_type}</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Availability</p>
                      <p className="font-medium">
                        {item.available_copies} of {item.total_copies} available
                      </p>
                      {getAvailabilityBadge(item.available_copies, item.total_copies)}
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
        )}

        {!loading && filteredItems.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No items found</h3>
              <p className="text-muted-foreground text-center">
                No library items match your search criteria. Try adjusting your filters or search terms.
              </p>
              <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add New Item
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <AddLibraryItemDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={loadCatalogItems}
      />
    </div>
  );
};

export default LibraryCatalog;