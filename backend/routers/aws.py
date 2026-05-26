import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, Depends, HTTPException
from core.auth import get_token
from core.config import settings

router = APIRouter(prefix="/api/aws", tags=["aws"])


def _boto(service: str):
    return boto3.client(
        service,
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id or None,
        aws_secret_access_key=settings.aws_secret_access_key or None,
    )


@router.get("/identity")
async def get_identity(token: str = Depends(get_token)):
    try:
        sts = _boto("sts")
        return sts.get_caller_identity()
    except (BotoCoreError, ClientError) as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/s3/buckets")
async def list_buckets(token: str = Depends(get_token)):
    try:
        s3 = _boto("s3")
        resp = s3.list_buckets()
        return [{"name": b["Name"], "created": b["CreationDate"].isoformat()} for b in resp.get("Buckets", [])]
    except (BotoCoreError, ClientError) as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/s3/{bucket}/objects")
async def list_objects(bucket: str, token: str = Depends(get_token)):
    try:
        s3 = _boto("s3")
        resp = s3.list_objects_v2(Bucket=bucket, MaxKeys=200)
        return [
            {
                "key": o["Key"],
                "size": o["Size"],
                "modified": o["LastModified"].isoformat(),
            }
            for o in resp.get("Contents", [])
        ]
    except (BotoCoreError, ClientError) as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dynamodb/tables")
async def list_dynamodb_tables(token: str = Depends(get_token)):
    try:
        db = _boto("dynamodb")
        tables = []
        paginator = db.get_paginator("list_tables")
        for page in paginator.paginate():
            tables.extend(page.get("TableNames", []))
        return tables
    except (BotoCoreError, ClientError) as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dynamodb/tables/{table_name}")
async def describe_dynamodb_table(table_name: str, token: str = Depends(get_token)):
    try:
        db = _boto("dynamodb")
        resp = db.describe_table(TableName=table_name)
        t = resp["Table"]
        return {
            "name": t["TableName"],
            "status": t["TableStatus"],
            "item_count": t.get("ItemCount", 0),
            "size_bytes": t.get("TableSizeBytes", 0),
            "keys": [{"name": k["AttributeName"], "type": k["KeyType"]} for k in t.get("KeySchema", [])],
            "billing": t.get("BillingModeSummary", {}).get("BillingMode", "PROVISIONED"),
        }
    except (BotoCoreError, ClientError) as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/apigateway/apis")
async def list_apis(token: str = Depends(get_token)):
    try:
        apigw = _boto("apigateway")
        resp = apigw.get_rest_apis()
        return [
            {
                "id": a["id"],
                "name": a["name"],
                "description": a.get("description", ""),
                "created": a["createdDate"].isoformat(),
                "endpoint": a.get("endpointConfiguration", {}).get("types", []),
            }
            for a in resp.get("items", [])
        ]
    except (BotoCoreError, ClientError) as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cloudfront/distributions")
async def list_distributions(token: str = Depends(get_token)):
    try:
        cf = _boto("cloudfront")
        resp = cf.list_distributions()
        items = resp.get("DistributionList", {}).get("Items", [])
        return [
            {
                "id": d["Id"],
                "domain": d["DomainName"],
                "aliases": d.get("Aliases", {}).get("Items", []),
                "status": d["Status"],
                "origins": [o["DomainName"] for o in d.get("Origins", {}).get("Items", [])],
                "modified": d["LastModifiedTime"].isoformat(),
                "enabled": d["Enabled"],
            }
            for d in items
        ]
    except (BotoCoreError, ClientError) as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/lambda/functions")
async def list_functions(token: str = Depends(get_token)):
    try:
        fn = _boto("lambda")
        resp = fn.list_functions()
        return [
            {
                "name": f["FunctionName"],
                "runtime": f.get("Runtime", ""),
                "memory": f["MemorySize"],
                "timeout": f["Timeout"],
                "description": f.get("Description", ""),
                "modified": f["LastModified"],
                "handler": f.get("Handler", ""),
            }
            for f in resp.get("Functions", [])
        ]
    except (BotoCoreError, ClientError) as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ec2/instances")
async def list_instances(token: str = Depends(get_token)):
    try:
        ec2 = _boto("ec2")
        resp = ec2.describe_instances()
        instances = []
        for r in resp.get("Reservations", []):
            for i in r.get("Instances", []):
                name = next((t["Value"] for t in i.get("Tags", []) if t["Key"] == "Name"), "—")
                instances.append({
                    "id": i["InstanceId"],
                    "name": name,
                    "type": i["InstanceType"],
                    "state": i["State"]["Name"],
                    "az": i.get("Placement", {}).get("AvailabilityZone", ""),
                    "public_ip": i.get("PublicIpAddress", ""),
                    "private_ip": i.get("PrivateIpAddress", ""),
                })
        return instances
    except (BotoCoreError, ClientError) as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/billing/summary")
async def billing_summary(refresh: bool = False, token: str = Depends(get_token)):
    from datetime import datetime, timezone, timedelta
    from core.firebase import get_db

    db = get_db()
    cache_doc = db.collection("aws_billing_cache").document("summary")

    if not refresh:
        doc = await cache_doc.get()
        if doc.exists:
            data = doc.to_dict()
            cached_at = data.get("cached_at")
            if cached_at and (datetime.now(timezone.utc) - cached_at).total_seconds() < 6 * 3600:
                return data

    try:
        from datetime import datetime, timezone, timedelta
        ce = boto3.client(
            "ce",
            region_name="us-east-1",
            aws_access_key_id=settings.aws_access_key_id or None,
            aws_secret_access_key=settings.aws_secret_access_key or None,
        )
        now = datetime.now(timezone.utc)
        this_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        prev_start = (this_start - timedelta(days=1)).replace(day=1)

        def fmt(d): return d.strftime("%Y-%m-%d")

        end_date = fmt(now + timedelta(days=1))

        resp = ce.get_cost_and_usage(
            TimePeriod={"Start": fmt(prev_start), "End": end_date},
            Granularity="MONTHLY",
            Metrics=["UnblendedCost"],
        )

        monthly = {}
        for r in resp.get("ResultsByTime", []):
            key = r["TimePeriod"]["Start"][:7]
            monthly[key] = float(r["Total"]["UnblendedCost"]["Amount"])

        this_key = now.strftime("%Y-%m")
        prev_key = (now.replace(day=1) - timedelta(days=1)).strftime("%Y-%m")
        this_amount = monthly.get(this_key, 0.0)
        prev_amount = monthly.get(prev_key, 0.0)
        change_pct = round((this_amount - prev_amount) / prev_amount * 100, 1) if prev_amount else 0.0

        resp_svc = ce.get_cost_and_usage(
            TimePeriod={"Start": fmt(this_start), "End": end_date},
            Granularity="MONTHLY",
            Metrics=["UnblendedCost"],
            GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}],
        )
        services = []
        for r in resp_svc.get("ResultsByTime", []):
            for group in r.get("Groups", []):
                amount = round(float(group["Metrics"]["UnblendedCost"]["Amount"]), 2)
                if amount > 0:
                    services.append({"name": group["Keys"][0], "amount": amount})
        services.sort(key=lambda x: x["amount"], reverse=True)

        result = {
            "this_month": {"label": now.strftime("%b %Y"), "amount": round(this_amount, 2)},
            "prev_month": {
                "label": (now.replace(day=1) - timedelta(days=1)).strftime("%b %Y"),
                "amount": round(prev_amount, 2),
            },
            "change_pct": change_pct,
            "services": services,
            "cached_at": datetime.now(timezone.utc),
        }
        await cache_doc.set(result)
        return result
    except (BotoCoreError, ClientError) as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dynamodb/alias-mail-aliases/items")
async def list_alias_mail(token: str = Depends(get_token)):
    try:
        db = _boto("dynamodb")
        resp = db.scan(TableName="alias-mail-aliases")
        items = [
            {
                "alias_email": i["alias_email"]["S"],
                "display_name": i.get("display_name", {}).get("S", ""),
            }
            for i in resp.get("Items", [])
        ]
        items.sort(key=lambda x: x["display_name"])
        return items
    except (BotoCoreError, ClientError) as e:
        raise HTTPException(status_code=500, detail=str(e))
