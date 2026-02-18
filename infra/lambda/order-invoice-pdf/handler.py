import json
import os
from datetime import datetime




def handler(event, context):
    body = event if isinstance(event, dict) else json.loads(event)
    order_id = body.get("order_id")
    if not order_id:
        return {"statusCode": 400, "body": json.dumps({"error": "order_id required"})}

   
    invoice_id = f"inv-{order_id}-{datetime.utcnow().strftime('%Y%m%d%H%M')}"
    bucket = os.environ.get("INVOICE_BUCKET", "invoices")
    region = os.environ.get("AWS_REGION", "us-east-1")
    mock_url = f"https://{bucket}.s3.{region}.amazonaws.com/{invoice_id}.pdf"

    return {
        "statusCode": 200,
        "body": json.dumps({"invoice_url": mock_url, "invoice_id": invoice_id}),
    }
