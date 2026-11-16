import React from 'react';
import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { EmptyState, Button } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="py-20 flex items-center justify-center">
      <EmptyState
        icon={FileQuestion}
        title="Page not found"
        description="The page you are looking for does not exist or has been moved."
        action={
          <Link href="/">
            <Button variant="secondary" size="md">
              Back to Generator
            </Button>
          </Link>
        }
      />
    </div>
  );
}
