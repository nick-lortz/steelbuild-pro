import React, { useState, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Image as ImageIcon, Calendar, MapPin, User, Tag, 
  Search, Filter, Download, Edit, Trash2, Grid3x3, List
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function PhotoGallery({ 
  photos = [],
  onPhotoClick,
  onPhotoDelete,
  showFilters = true 
}) {
  const [viewMode, setViewMode] = useState('grid'); // grid | list
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('all');
  const [filterArea, setFilterArea] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Extract unique filters
  const uniqueDates = useMemo(() => {
    const dates = photos
      .map(p => p.date)
      .filter(Boolean)
      .reduce((acc, date) => {
        const monthYear = format(parseISO(date), 'MMM yyyy');
        if (!acc.includes(monthYear)) acc.push(monthYear);
        return acc;
      }, []);
    return dates.sort().reverse();
  }, [photos]);

  const uniqueAreas = useMemo(() => {
    return [...new Set(photos.map(p => p.area).filter(Boolean))];
  }, [photos]);

  const uniqueTags = useMemo(() => {
    const allTags = photos.flatMap(p => p.tags || []);
    return [...new Set(allTags)];
  }, [photos]);

  // Filtered photos
  const filteredPhotos = useMemo(() => {
    return photos.filter(photo => {
      const matchesSearch = 
        photo.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        photo.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDate = filterDate === 'all' || 
        (photo.date && format(parseISO(photo.date), 'MMM yyyy') === filterDate);

      const matchesArea = filterArea === 'all' || photo.area === filterArea;

      const matchesTag = filterTag === 'all' || 
        (photo.tags && photo.tags.includes(filterTag));

      return matchesSearch && matchesDate && matchesArea && matchesTag;
    });
  }, [photos, searchTerm, filterDate, filterArea, filterTag]);

  // Group by date for list view
  const photosByDate = useMemo(() => {
    const grouped = {};
    filteredPhotos.forEach(photo => {
      const date = photo.date ? format(parseISO(photo.date), 'MMM d, yyyy') : 'No Date';
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(photo);
    });
    return grouped;
  }, [filteredPhotos]);

  const handlePhotoClick = (photo) => {
    setSelectedPhoto(photo);
    if (onPhotoClick) onPhotoClick(photo);
  };

  return (
    <>
      {/* Filters */}
      {showFilters && (
        <Card className="bg-zinc-900 border-zinc-800 mb-4">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <Input
                  placeholder="Search photos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-zinc-950 border-zinc-700 text-white"
                />
              </div>

              {/* Date Filter */}
              <Select value={filterDate} onValueChange={setFilterDate}>
                <SelectTrigger className="w-40 bg-zinc-950 border-zinc-700 text-white">
                  <SelectValue placeholder="All Dates" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all">All Dates</SelectItem>
                  {uniqueDates.map(date => (
                    <SelectItem key={date} value={date}>{date}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Area Filter */}
              <Select value={filterArea} onValueChange={setFilterArea}>
                <SelectTrigger className="w-40 bg-zinc-950 border-zinc-700 text-white">
                  <SelectValue placeholder="All Areas" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all">All Areas</SelectItem>
                  {uniqueAreas.map(area => (
                    <SelectItem key={area} value={area}>{area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Tag Filter */}
              <Select value={filterTag} onValueChange={setFilterTag}>
                <SelectTrigger className="w-40 bg-zinc-950 border-zinc-700 text-white">
                  <SelectValue placeholder="All Tags" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all">All Tags</SelectItem>
                  {uniqueTags.map(tag => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* View Toggle */}
              <div className="flex items-center gap-1 border-l border-zinc-700 pl-3">
                <Button
                  size="sm"
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('grid')}
                  className={cn('h-8 w-8 p-0', viewMode === 'grid' && 'bg-amber-500 text-black')}
                >
                  <Grid3x3 size={16} />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('list')}
                  className={cn('h-8 w-8 p-0', viewMode === 'list' && 'bg-amber-500 text-black')}
                >
                  <List size={16} />
                </Button>
              </div>
            </div>

            {/* Active Filters Summary */}
            {(searchTerm || filterDate !== 'all' || filterArea !== 'all' || filterTag !== 'all') && (
              <div className="flex items-center gap-2 mt-3 text-xs">
                <span className="text-zinc-500">Active filters:</span>
                {searchTerm && (
                  <Badge variant="outline" className="bg-zinc-800">
                    Search: "{searchTerm}"
                  </Badge>
                )}
                {filterDate !== 'all' && (
                  <Badge variant="outline" className="bg-zinc-800">{filterDate}</Badge>
                )}
                {filterArea !== 'all' && (
                  <Badge variant="outline" className="bg-zinc-800">{filterArea}</Badge>
                )}
                {filterTag !== 'all' && (
                  <Badge variant="outline" className="bg-zinc-800">{filterTag}</Badge>
                )}
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterDate('all');
                    setFilterArea('all');
                    setFilterTag('all');
                  }}
                  className="text-amber-500 hover:underline ml-2"
                >
                  Clear all
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results Count */}
      <div className="text-sm text-zinc-400 mb-3">
        {filteredPhotos.length} {filteredPhotos.length === 1 ? 'photo' : 'photos'}
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPhotos.map((photo) => (
            <Card
              key={photo.id}
              className="bg-zinc-900 border-zinc-800 overflow-hidden cursor-pointer hover:border-amber-500 transition-colors group"
              onClick={() => handlePhotoClick(photo)}
            >
              <div className="aspect-video bg-zinc-950 relative overflow-hidden">
                <img
                  src={photo.url}
                  alt={photo.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                {photo.has_annotations && (
                  <Badge className="absolute top-2 right-2 bg-purple-500">
                    <Edit size={10} className="mr-1" />
                    Annotated
                  </Badge>
                )}
              </div>
              <CardContent className="p-3">
                <p className="text-sm font-semibold text-white truncate">{photo.title}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
                  {photo.date && (
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />
                      {format(parseISO(photo.date), 'MMM d')}
                    </span>
                  )}
                  {photo.area && (
                    <span className="flex items-center gap-1">
                      <MapPin size={10} />
                      {photo.area}
                    </span>
                  )}
                </div>
                {photo.tags && photo.tags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {photo.tags.slice(0, 2).map(tag => (
                      <Badge key={tag} className="bg-zinc-800 text-xs px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                    {photo.tags.length > 2 && (
                      <Badge className="bg-zinc-800 text-xs px-1.5 py-0">
                        +{photo.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          {Object.entries(photosByDate).map(([date, datePhotos]) => (
            <div key={date}>
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Calendar size={14} />
                {date}
              </h3>
              <div className="space-y-2">
                {datePhotos.map((photo) => (
                  <Card
                    key={photo.id}
                    className="bg-zinc-900 border-zinc-800 cursor-pointer hover:border-amber-500 transition-colors"
                    onClick={() => handlePhotoClick(photo)}
                  >
                    <CardContent className="p-3">
                      <div className="flex gap-4">
                        <div className="w-32 h-24 bg-zinc-950 rounded overflow-hidden flex-shrink-0">
                          <img
                            src={photo.url}
                            alt={photo.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-white mb-1">{photo.title}</h4>
                              {photo.description && (
                                <p className="text-sm text-zinc-400 line-clamp-2">{photo.description}</p>
                              )}
                            </div>
                            {photo.has_annotations && (
                              <Badge className="bg-purple-500 flex-shrink-0">
                                Annotated
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                            {photo.area && (
                              <span className="flex items-center gap-1">
                                <MapPin size={10} />
                                {photo.area}
                              </span>
                            )}
                            {photo.uploaded_by && (
                              <span className="flex items-center gap-1">
                                <User size={10} />
                                {photo.uploaded_by}
                              </span>
                            )}
                          </div>
                          {photo.tags && photo.tags.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {photo.tags.map(tag => (
                                <Badge key={tag} className="bg-zinc-800 text-xs px-1.5 py-0">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredPhotos.length === 0 && (
        <div className="text-center py-20">
          <ImageIcon size={48} className="mx-auto mb-4 text-zinc-700" />
          <h3 className="text-lg font-bold text-white mb-2">No Photos Found</h3>
          <p className="text-sm text-zinc-500">
            {searchTerm || filterDate !== 'all' || filterArea !== 'all' || filterTag !== 'all'
              ? 'Try adjusting your filters'
              : 'Upload photos to get started'}
          </p>
        </div>
      )}

      {/* Photo Detail Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl bg-zinc-900 border-zinc-800 text-white">
          {selectedPhoto && (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold mb-1">{selectedPhoto.title}</h2>
                  <div className="flex items-center gap-3 text-sm text-zinc-400">
                    {selectedPhoto.date && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {format(parseISO(selectedPhoto.date), 'MMM d, yyyy')}
                      </span>
                    )}
                    {selectedPhoto.area && (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {selectedPhoto.area}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="border-zinc-700">
                    <Download size={14} />
                  </Button>
                  {onPhotoDelete && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onPhotoDelete(selectedPhoto.id)}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </div>

              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.title}
                className="w-full rounded border border-zinc-800"
              />

              {selectedPhoto.description && (
                <p className="text-sm text-zinc-300">{selectedPhoto.description}</p>
              )}

              {selectedPhoto.tags && selectedPhoto.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {selectedPhoto.tags.map(tag => (
                    <Badge key={tag} className="bg-zinc-800">
                      <Tag size={10} className="mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}