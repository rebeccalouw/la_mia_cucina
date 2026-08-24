*** Settings ***
Documentation       /api/categories — the shared recipe category list.

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

Categories Are Shared Between Users Rather Than Owned
    [Documentation]    The table has no user column: a category created by one account is
    ...    visible to every account. This records that as intended behaviour.
    ${label}=    Unique Name    Shared
    Create A Recipe    categories=${{ [$label] }}
    ${response}=    Authorized GET    /api/categories    token=${OTHER}[token]
    ${names}=    Evaluate    [c['name'] for c in $response.json()]
    Should Contain    ${names}    ${label}


*** Keywords ***
Start Category Suite
    Open API Session
    Register The Suite User    categories
    ${other}=    Register A User    categories-other
    VAR    ${OTHER}    ${other}    scope=SUITE
