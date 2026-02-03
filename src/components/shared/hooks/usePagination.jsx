/**
 * Pagination Hook
 * 
 * Provides pagination state and controls for data tables
 */

import { useState, useMemo } from 'react';

export function usePagination(initialPage = 1, initialPageSize = 50) {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const pagination = useMemo(() => ({
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    limit: pageSize
  }), [page, pageSize]);

  const goToPage = (newPage) => {
    setPage(Math.max(1, newPage));
  };

  const nextPage = () => {
    setPage(prev => prev + 1);
  };

  const prevPage = () => {
    setPage(prev => Math.max(1, prev - 1));
  };

  const changePageSize = (newSize) => {
    setPageSize(newSize);
    setPage(1); // Reset to first page
  };

  const reset = () => {
    setPage(1);
  };

  return {
    page,
    pageSize,
    skip: pagination.skip,
    limit: pagination.limit,
    goToPage,
    nextPage,
    prevPage,
    changePageSize,
    reset
  };
}

/**
 * Calculate pagination metadata
 */
export function getPaginationInfo(total, page, pageSize) {
  const totalPages = Math.ceil(total / pageSize);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  return {
    total,
    totalPages,
    currentPage: page,
    pageSize,
    hasNextPage,
    hasPrevPage,
    startIndex,
    endIndex
  };
}