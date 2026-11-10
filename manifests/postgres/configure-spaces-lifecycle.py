"""Preview or apply TTT's lifecycle rule, preserving unrelated bucket rules."""
import argparse
import json
from pathlib import Path

import boto3
from botocore.exceptions import ClientError


def merge_rules(rules, desired):
    remaining = [rule for rule in rules if rule.get('ID') != desired['ID']]
    for rule in remaining:
        if rule.get('Status') != 'Enabled' or not any(
            field in rule for field in ('Expiration', 'NoncurrentVersionExpiration')
        ):
            continue
        filters = rule.get('Filter', {})
        prefix = filters.get('Prefix', filters.get('And', {}).get('Prefix', rule.get('Prefix', '')))
        media = 'ttt/media/'
        if media.startswith(prefix) or prefix.startswith(media):
            raise ValueError(
                f"Rule {rule.get('ID', '(unnamed)')!r} may expire product images "
                f"(prefix {prefix!r}). Narrow or remove that rule before proceeding."
            )
    return remaining + [desired]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--profile', required=True, help='AWS profile containing a Full access Spaces key')
    parser.add_argument('--apply', action='store_true', help='Apply after inspecting the preview')
    args = parser.parse_args()
    s3 = boto3.Session(profile_name=args.profile).client(
        's3', endpoint_url='https://sfo3.digitaloceanspaces.com', region_name='sfo3'
    )
    bucket = 'power-bucket'
    try:
        rules = s3.get_bucket_lifecycle_configuration(Bucket=bucket).get('Rules', [])
    except ClientError as error:
        if error.response['Error']['Code'] != 'NoSuchLifecycleConfiguration':
            raise
        rules = []
    desired = json.loads(Path(__file__).with_name('backup-lifecycle.json').read_text())
    merged = {'Rules': merge_rules(rules, desired)}
    print(json.dumps(merged, indent=2))
    if args.apply:
        s3.put_bucket_lifecycle_configuration(Bucket=bucket, LifecycleConfiguration=merged)
        actual = s3.get_bucket_lifecycle_configuration(Bucket=bucket)['Rules']
        if actual != merged['Rules']:
            raise RuntimeError('Lifecycle read-back differs from the submitted configuration')
        print('Applied and verified. TTT media is outside all enabled expiration rules.')
    else:
        print('Preview only. Rerun with --apply to save.')


if __name__ == '__main__':
    main()
