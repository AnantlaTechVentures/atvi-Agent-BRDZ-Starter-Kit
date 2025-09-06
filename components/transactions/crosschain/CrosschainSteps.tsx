//Path: components/transactions/crosschain/CrosschainSteps.tsx

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface CrosschainStep {
  id: number;
  name: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

interface CrosschainStepsProps {
  steps: CrosschainStep[];
  isVisible: boolean;
}

export default function CrosschainSteps({ steps, isVisible }: CrosschainStepsProps) {
  if (!isVisible) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Crosschain Transfer Progress
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="relative">
              <div className="flex items-center gap-3">
                {/* Step Icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  step.status === 'completed' ? 'bg-green-100 text-green-700 border-2 border-green-300' :
                  step.status === 'processing' ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' :
                  step.status === 'failed' ? 'bg-red-100 text-red-700 border-2 border-red-300' :
                  'bg-gray-100 text-gray-500 border-2 border-gray-200'
                }`}>
                  {step.status === 'completed' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : step.status === 'processing' ? (
                    <LoadingSpinner size="sm" />
                  ) : step.status === 'failed' ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    step.id
                  )}
                </div>
                
                {/* Step Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${
                      step.status === 'completed' ? 'text-green-700' :
                      step.status === 'processing' ? 'text-blue-700' :
                      step.status === 'failed' ? 'text-red-700' :
                      'text-gray-500'
                    }`}>
                      {step.name}
                    </span>
                    
                    {step.status === 'processing' && (
                      <Badge variant="outline" className="text-blue-600 border-blue-600">
                        Processing...
                      </Badge>
                    )}
                    
                    {step.status === 'completed' && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Completed
                      </Badge>
                    )}
                    
                    {step.status === 'failed' && (
                      <Badge variant="outline" className="text-red-600 border-red-600">
                        Failed
                      </Badge>
                    )}
                    
                    {/* {step.retry_count > 0 && (
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        Retry {step.retry_count}
                      </Badge>
                    )} */}
                  </div>
                  
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                  
                  {step.error && (
                    <p className="text-xs text-red-600 mt-1">{step.error}</p>
                  )}
                </div>
              </div>
              
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className={`absolute left-4 top-8 w-0.5 h-6 ${
                  step.status === 'completed' ? 'bg-green-300' :
                  step.status === 'processing' ? 'bg-blue-300' :
                  'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Bridge process may take 5-15 minutes. Each step will be retried up to 2 times if it fails.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}