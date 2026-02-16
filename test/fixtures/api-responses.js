{
  "success": {
    "status": 200,
    "json": {
      "job_id": "batch_test_123456",
      "status": "pending",
      "total_emails": 10,
      "processed_emails": 0,
      "submitted_at": "2024-01-04T10:30:00.000Z",
      "estimated_completion_time": "2024-01-04T10:35:00.000Z",
      "queue_position": 1,
      "estimated_processing_time": 300
    }
  },
  "validation": {
    "status": 200,
    "json": {
      "email": "test@example.com",
      "valid": true,
      "status": "deliverable",
      "risk_score": 0.1,
      "quality_score": 0.89,
      "risk_level": "low",
      "quality_tier": "excellent",
      "is_high_risk": false,
      "is_safe_to_send": true,
      "should_review": false,
      "recommendation": "safe_to_send",
      "smtp_validation": {
        "checked": true,
        "mailbox_exists": true
      },
      "spam_trap_check": {
        "checked": true,
        "is_spam_trap": false
      },
      "provider_analysis": {
        "provider": "gmail",
        "reputation": 95
      },
      "dns_security": {
        "spf": { "status": "pass"},
        "dkim": { "status": "pass"},
        "dmarc": { "status": "pass"}
      },
      "metadata": {
        "validation_id": "val_123456789",
        "cache_used": false
      },
      "client_plan": "PREMIUM"
    }
  },
  "batch_pending": {
    "status": 200,
    "json": {
      "job_id": "batch_550e8400-e29b-41d4-a716-446655440000",
      "status": "pending",
      "total_emails": 50,
      "processed_emails": 0,
      "submitted_at": "2024-01-04T10:30:00.000Z"
    }
  },
  "batch_processing": {
    "status": 200,
    "json": {
      "job_id": "batch_550e8400-e29b-41d4-a716-446655440001",
      "status": "processing",
      "total_emails": 50,
      "processed_emails": 25,
      "progress_percent": 50
    }
  },
  "batch_completed": {
    "status": 200,
    "json": {
      "job_id": "batch_550e8400-e29b-41d4-a716-446655440002",
      "status": "completed",
      "total_emails": 50,
      "processed_emails": 50,
      "progress_percent": 100,
      "completed_at": "2024-01-04T10:35:00.000Z"
    }
  },
  "batch_cancelled": {
    "status": 200,
    "json": {
      "job_id": "batch_550e8400-e29b-41d4-a716-446655440003",
      "status": "cancelled",
      "total_emails": 100,
      "processed_emails": 30,
      "cancelled_at": "2024-01-04T10:30:00.000Z",
      "refund_info": {
        "refunded": true,
        "refund_amount": 70
      }
    }
  },
  "webhook": {
    "status": 200,
    "json": {
      "webhook_id": "wh_550e8400-e29b-41d4-a716-446655440000",
      "status": "active",
      "url": "https://example.com/webhook",
      "events": ["batch.completed", "batch.failed"],
      "created_at": "2024-01-04T10:30:00.000Z",
      "secret": "whsec_abc123xyz789"
    }
  },
  "usage": {
    "status": 200,
    "json": {
      "period": "current_month",
      "total_requests": 50000,
      "successful_requests": 49500,
      "failed_requests": 500,
      "success_rate": 0.99,
      "plan_limit": 50000,
      "remaining": 0,
      "usage_percent": 100,
      "plan_name": "Premium",
      "breakdown": {
        "validation": 45000,
        "batch": 4000,
        "webhook": 1000
      },
      "reset_date": "2024-02-01T00:00:00.000Z"
    }
  },
  "job_results": {
    "status": 200,
    "json": {
      "job_id": "batch_550e8400-e29b-41d4-a716-446655440000",
      "page": 1,
      "page_size": 50,
      "total_pages": 1,
      "total_count": 50,
      "results": Array.from({ length: 50 }, (_, i) => ({
        "email": `user${i}@example.com`,
        "valid": i % 3 !== 0,
        "status": i % 3 !== 0 ? "deliverable" : "undeliverable",
        "risk_score": i % 3 === 0 ? 0.1 : (i % 5 === 0 ? 0.7 : 0.9),
        "quality_score": i % 3 !== 0 ? 0.89 : 0.3
      })),
      "summary": {
        "valid": 33,
        "invalid": 17,
        "risky": 10,
        "unknown": 0,
        "deliverability_rate": 0.66,
        "risk_rate": 0.2,
        "quality_rate": 0.66
      }
    }
  },
  "auth_test": {
    "status": 200,
    "json": {
      "success": true,
      "auth_method": "api_key"
    }
  }
}
