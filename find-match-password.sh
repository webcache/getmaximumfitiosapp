#!/bin/bash

echo "🔍 Testing Match Password Candidates"
echo "===================================="

cd ios

# Test candidates - common passwords that might have been used
CANDIDATES=(
    "Room12$$!!"
    "MySecureMatchPassword2025!"
    "password"
    "Match2025!"
    "GetMaximumFit2025!"
    ""
)

export CI=true
export GITHUB_ACTIONS=true
export MATCH_GIT_BASIC_AUTHORIZATION="d2ViY2FjaGU6Z2l0aHViX3BhdF8xMUFCNkxXNlkwYjlKOGxkVGJPTlBSX2tKZVd1bXJHaExhVjA1elQ5R29IMUxKcXFKdmlMSG8zQ014N0J0ck5ZczZDNk5FMjVPWWNicXEwS0Nt"

for password in "${CANDIDATES[@]}"; do
    echo ""
    echo "Testing password: '$password'"
    export MATCH_PASSWORD="$password"
    
    bundle exec fastlane match appstore --readonly >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ SUCCESS! Match password is: '$password'"
        echo ""
        echo "🎯 Update your GitHub secret MATCH_PASSWORD to: $password"
        exit 0
    else
        echo "❌ Failed"
    fi
done

echo ""
echo "❌ None of the candidate passwords worked."
echo "The Match repository might need to be reset with a known password."
