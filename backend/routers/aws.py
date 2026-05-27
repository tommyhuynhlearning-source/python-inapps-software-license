from fastapi import APIRouter, Depends, HTTPException
from core.auth import get_token
from core.config import settings

router = APIRouter(prefix="/api/aws", tags=["aws"])


def _boto(service: str, region: str | None = None):
    import boto3  # lazy — boto3 is heavy; don't pay import cost on non-AWS cold starts
    return boto3.client(
        service,
        region_name=region or settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id or None,
        aws_secret_access_key=settings.aws_secret_access_key or None,
    )


@router.get("/identity")
async def get_identity(token: str = Depends(get_token)):
    try:
        sts = _boto("sts")
        return sts.get_caller_identity()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/s3/buckets")
async def list_buckets(token: str = Depends(get_token)):
    try:
        s3 = _boto("s3")
        resp = s3.list_buckets()
        return [{"name": b["Name"], "created": b["CreationDate"].isoformat()} for b in resp.get("Buckets", [])]
    except Exception as e:
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
    except Exception as e:
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
    except Exception as e:
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
    except Exception as e:
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
    except Exception as e:
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
    except Exception as e:
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
    except Exception as e:
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/billing/summary")
async def billing_summary(
    refresh: bool = False,
    year: int | None = None,
    month: int | None = None,
    token: str = Depends(get_token),
):
    from datetime import datetime, timezone, timedelta
    from core.firebase import get_db

    db = get_db()
    now = datetime.now(timezone.utc)

    target = now.replace(
        year=year if year else now.year,
        month=month if month else now.month,
        day=1, hour=0, minute=0, second=0, microsecond=0,
    )
    is_current = target.year == now.year and target.month == now.month
    cache_key = target.strftime("%Y-%m")
    cache_doc = db.collection("aws_billing_cache").document(cache_key)

    if not refresh:
        doc = await cache_doc.get()
        if doc.exists:
            data = doc.to_dict()
            cached_at = data.get("cached_at")
            if cached_at:
                age = (now - cached_at).total_seconds()
                if not is_current or age < 6 * 3600:
                    return data

    try:
        ce = _boto("ce", region="us-east-1")

        this_start = target
        prev_start = (this_start - timedelta(days=1)).replace(day=1)

        def fmt(d): return d.strftime("%Y-%m-%d")

        if is_current:
            end_date = fmt(now + timedelta(days=1))
        elif target.month == 12:
            end_date = fmt(target.replace(year=target.year + 1, month=1))
        else:
            end_date = fmt(target.replace(month=target.month + 1))

        resp = ce.get_cost_and_usage(
            TimePeriod={"Start": fmt(prev_start), "End": end_date},
            Granularity="MONTHLY",
            Metrics=["UnblendedCost"],
        )

        monthly = {}
        for r in resp.get("ResultsByTime", []):
            key = r["TimePeriod"]["Start"][:7]
            monthly[key] = float(r["Total"]["UnblendedCost"]["Amount"])

        this_key = target.strftime("%Y-%m")
        prev_key = prev_start.strftime("%Y-%m")
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
            "this_month": {"label": target.strftime("%b %Y"), "amount": round(this_amount, 2)},
            "prev_month": {"label": prev_start.strftime("%b %Y"), "amount": round(prev_amount, 2)},
            "change_pct": change_pct,
            "services": services,
            "cached_at": now,
        }
        await cache_doc.set(result)
        return result
    except Exception as e:
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
