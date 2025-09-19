import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface AddLibraryItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AddLibraryItemDialog = ({ open, onOpenChange, onSuccess }: AddLibraryItemDialogProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    barcode: '',
    category: '',
    item_type: '',
    description: '',
    publisher: '',
    edition: '',
    publication_year: '',
    language: 'English',
    subject: '',
    location: '',
    total_copies: '1',
    available_copies: '1',
    cover_image_url: ''
  });

  const categories = [
    'Fiction',
    'Non-Fiction', 
    'Textbook',
    'Reference',
    'Biography',
    'History',
    'Science',
    'Mathematics',
    'Literature',
    'Magazine',
    'Journal',
    'DVD',
    'Audio Book'
  ];

  const itemTypes = [
    'book',
    'ebook', 
    'magazine',
    'journal',
    'dvd',
    'material'
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.category || !formData.item_type) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields (Title, Category, Item Type)',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      const itemData = {
        title: formData.title,
        author: formData.author || null,
        isbn: formData.isbn || null,
        barcode: formData.barcode || null,
        category: formData.category,
        item_type: formData.item_type,
        description: formData.description || null,
        publisher: formData.publisher || null,
        edition: formData.edition || null,
        publication_year: formData.publication_year ? parseInt(formData.publication_year) : null,
        language: formData.language,
        subject: formData.subject || null,
        location: formData.location || null,
        total_copies: parseInt(formData.total_copies),
        available_copies: parseInt(formData.available_copies),
        cover_image_url: formData.cover_image_url || null,
        is_active: true
      };

      const { error } = await supabase
        .from('library_items')
        .insert([itemData]);

      if (error) {
        throw error;
      }

      toast({
        title: 'Success',
        description: 'Library item added successfully'
      });

      // Reset form
      setFormData({
        title: '',
        author: '',
        isbn: '',
        barcode: '',
        category: '',
        item_type: '',
        description: '',
        publisher: '',
        edition: '',
        publication_year: '',
        language: 'English',
        subject: '',
        location: '',
        total_copies: '1',
        available_copies: '1',
        cover_image_url: ''
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error adding library item:', error);
      toast({
        title: 'Error',
        description: 'Failed to add library item. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Library Item</DialogTitle>
          <DialogDescription>
            Fill in the details for the new library item.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter book/item title"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                value={formData.author}
                onChange={(e) => handleInputChange('author', e.target.value)}
                placeholder="Enter author name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="isbn">ISBN</Label>
              <Input
                id="isbn"
                value={formData.isbn}
                onChange={(e) => handleInputChange('isbn', e.target.value)}
                placeholder="Enter ISBN"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => handleInputChange('barcode', e.target.value)}
                placeholder="Enter barcode"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="item_type">Item Type *</Label>
              <Select value={formData.item_type} onValueChange={(value) => handleInputChange('item_type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select item type" />
                </SelectTrigger>
                <SelectContent>
                  {itemTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="publisher">Publisher</Label>
              <Input
                id="publisher"
                value={formData.publisher}
                onChange={(e) => handleInputChange('publisher', e.target.value)}
                placeholder="Enter publisher"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edition">Edition</Label>
              <Input
                id="edition"
                value={formData.edition}
                onChange={(e) => handleInputChange('edition', e.target.value)}
                placeholder="Enter edition"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="publication_year">Publication Year</Label>
              <Input
                id="publication_year"
                type="number"
                value={formData.publication_year}
                onChange={(e) => handleInputChange('publication_year', e.target.value)}
                placeholder="YYYY"
                min="1000"
                max={new Date().getFullYear()}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Input
                id="language"
                value={formData.language}
                onChange={(e) => handleInputChange('language', e.target.value)}
                placeholder="Enter language"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                placeholder="Enter subject"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="e.g., A-12-03"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="total_copies">Total Copies</Label>
              <Input
                id="total_copies"
                type="number"
                value={formData.total_copies}
                onChange={(e) => handleInputChange('total_copies', e.target.value)}
                min="1"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="available_copies">Available Copies</Label>
              <Input
                id="available_copies"
                type="number"
                value={formData.available_copies}
                onChange={(e) => handleInputChange('available_copies', e.target.value)}
                min="0"
                max={formData.total_copies}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter a brief description of the item"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cover_image_url">Cover Image URL</Label>
            <Input
              id="cover_image_url"
              value={formData.cover_image_url}
              onChange={(e) => handleInputChange('cover_image_url', e.target.value)}
              placeholder="Enter cover image URL (optional)"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddLibraryItemDialog;