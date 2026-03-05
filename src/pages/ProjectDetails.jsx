import React from 'react';

export default function ProjectDetails() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Project Details {id ? `- ${id}` : ''}</h1>
      <p className="text-muted-foreground">Detailed view for a specific project.</p>
    </div>
  );
}