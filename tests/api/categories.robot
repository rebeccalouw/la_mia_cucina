*** Settings ***
Documentation       /api/categories — the categories in use on the caller’s recipes.

Resource            ../resources/api.resource

Suite Setup         Start Category Suite
Suite Teardown      Delete Everything The Suite User Owns

Test Tags           api    categories


*** Test Cases ***
Reading Categories Needs A Token
    Request Without A Token Should Be Rejected    GET    /api/categories

Categories Come Back As Rows With An Id And A Name
    Create A Recipe    categories=${{ ['Pasta'] }}
    ${response}=    Authorized GET    /api/categories
    Should Not Be Empty    ${response.json()}
    Dictionary Should Contain Key    ${response.json()}[0]    id
    Dictionary Should Contain Key    ${response.json()}[0]    name

A Category Named On A New Recipe Is Added To The List
    ${label}=    Unique Name    Category
    ${before}=    Authorized GET    /api/categories
    ${names}=    Evaluate    [c['name'] for c in $before.json()]
    Should Not Contain    ${names}    ${label}
    Create A Recipe    categories=${{ [$label] }}
    ${after}=    Authorized GET    /api/categories
    ${names}=    Evaluate    [c['name'] for c in $after.json()]
    Should Contain    ${names}    ${label}

The Category List Is Sorted By Name
    [Documentation]    Postgres orders by the database collation, which ignores case, so the
    ...    expectation is a case-insensitive sort rather than a codepoint one.
    ${response}=    Authorized GET    /api/categories
    ${names}=    Evaluate    [c['name'] for c in $response.json()]
    ${sorted}=    Evaluate    sorted($names, key=str.casefold)
    Should Be Equal    ${names}    ${sorted}

Another User's Category Is Not In The List
    [Documentation]    The table still has no user column — a row created by one account is
    ...    reachable by every account — but the list is scoped to the categories in use on the
    ...    caller's own recipes, so one kitchen's labels stay out of another's filter rail.
    ${label}=    Unique Name    Shared
    Create A Recipe    categories=${{ [$label] }}
    ${response}=    Authorized GET    /api/categories    token=${OTHER}[token]
    ${names}=    Evaluate    [c['name'] for c in $response.json()]
    Should Not Contain    ${names}    ${label}

A Category Drops Off The List When Its Last Recipe Goes
    [Documentation]    Categories are never deleted, so a label whose recipes have all gone
    ...    would otherwise sit in the filter rail forever, matching nothing.
    ${label}=    Unique Name    Orphan
    ${recipe}=    Create A Recipe    categories=${{ [$label] }}
    ${before}=    Authorized GET    /api/categories
    ${names}=    Evaluate    [c['name'] for c in $before.json()]
    Should Contain    ${names}    ${label}
    Authorized DELETE    /api/recipes/${recipe}[id]
    ${after}=    Authorized GET    /api/categories
    ${names}=    Evaluate    [c['name'] for c in $after.json()]
    Should Not Contain    ${names}    ${label}


*** Keywords ***
Start Category Suite
    Open API Session
    Register The Suite User    categories
    ${other}=    Register A User    categories-other
    VAR    ${OTHER}    ${other}    scope=SUITE
