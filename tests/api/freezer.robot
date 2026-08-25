*** Settings ***
Documentation       /api/freezer — freezer inventory and its categories.

Resource            ../resources/api.resource

Suite Setup         Start Freezer Suite
Suite Teardown      Delete Everything The Suite User Owns

Test Tags           api    freezer


*** Test Cases ***
Every Freezer Route Needs A Token
    [Template]    Request Without A Token Should Be Rejected
    GET       /api/freezer
    GET       /api/freezer/categories
    POST      /api/freezer
    PUT       /api/freezer/1
    DELETE    /api/freezer/1

An Ingredient And A Ready Made Meal Can Both Be Added
    [Documentation]    The two types are tracked separately in the UI, and the column has a
    ...    CHECK constraint, so both need to round-trip.
    [Template]    Adding An Item Of Type Should Succeed
    ingredient
    meal

Creating An Item Returns What Was Stored
    ${name}=    Unique Name    Lasagne
    ${body}=    Create Dictionary    name=${name}    type=meal
    ${response}=    Authorized POST    /api/freezer    ${body}    expected_status=201
    Should Be Equal    ${response.json()}[name]    ${name}
    Should Be Equal    ${response.json()}[type]    meal
    Should Not Be Equal    ${response.json()}[id]    ${None}

Creating An Item Without A Name Or A Type Is Rejected
    [Template]    Creating An Item Should Fail
    ${EMPTY}    meal
    Nameless    ${EMPTY}

Creating An Item With A Type The Column Forbids Fails
    [Documentation]    `type` is constrained to ingredient or meal. Anything else violates the
    ...    CHECK constraint, which the controller reports as a 500 rather than a 400 — recorded
    ...    here as current behaviour.
    ${body}=    Create Dictionary    name=Impossible    type=leftovers
    ${response}=    Authorized POST    /api/freezer    ${body}    expected_status=500
    Error Message Should Be    ${response}    Failed to create freezer item

An Item Given No Date Is Placed In The Freezer Now
    ${item}=    Create A Freezer Item
    ${response}=    Authorized GET    /api/freezer
    ${stored}=    Find Item    ${response.json()}    ${item}[id]
    Should Not Be Equal    ${stored}[placed_at]    ${None}

An Explicit Placed At Date Is Kept
    ${name}=    Unique Name    Older
    ${body}=    Create Dictionary    name=${name}    type=meal    placed_at=2026-01-15T10:00:00Z
    ${created}=    Authorized POST    /api/freezer    ${body}    expected_status=201
    ${response}=    Authorized GET    /api/freezer
    ${stored}=    Find Item    ${response.json()}    ${created.json()}[id]
    Should Contain    ${stored}[placed_at]    2026-01-15

The Freezer Lists Only The Owner's Items
    ${mine}=    Create A Freezer Item
    ${theirs}=    Create A Freezer Item    token=${OTHER}[token]
    ${response}=    Authorized GET    /api/freezer
    ${ids}=    Evaluate    [i['id'] for i in $response.json()]
    Should Contain    ${ids}    ${mine}[id]
    Should Not Contain    ${ids}    ${theirs}[id]

Items Are Listed Newest First
    ${response}=    Authorized GET    /api/freezer
    ${dates}=    Evaluate    [i['placed_at'] for i in $response.json()]
    ${expected}=    Evaluate    sorted($dates, reverse=True)
    Should Be Equal    ${dates}    ${expected}

Categories Given On Create Are Stored And Returned
    ${categories}=    Create List    Batch Cooked    Beef
    ${item}=    Create A Freezer Item    categories=${categories}
    ${response}=    Authorized GET    /api/freezer
    ${stored}=    Find Item    ${response.json()}    ${item}[id]
    Should Contain    ${stored}[categories]    Batch Cooked
    Should Contain    ${stored}[categories]    Beef

An Item With No Categories Comes Back With An Empty List
    ${item}=    Create A Freezer Item
    ${response}=    Authorized GET    /api/freezer
    ${stored}=    Find Item    ${response.json()}    ${item}[id]
    Should Be Empty    ${stored}[categories]

A Category Named On A New Item Joins The Freezer Category List
    ${label}=    Unique Name    Frozen Category
    ${categories}=    Create List    ${label}
    Create A Freezer Item    categories=${categories}
    ${response}=    Authorized GET    /api/freezer/categories
    ${names}=    Evaluate    [c['name'] for c in $response.json()]
    Should Contain    ${names}    ${label}

Another User's Freezer Category Is Not In The List
    [Documentation]    freezer_categories has no user column, but the list is scoped to the
    ...    categories in use on the caller's own items, so one account's labels are never
    ...    offered as suggestions to another.
    ${label}=    Unique Name    Frozen Category
    Create A Freezer Item    categories=${{ [$label] }}
    ${response}=    Authorized GET    /api/freezer/categories    token=${OTHER}[token]
    ${names}=    Evaluate    [c['name'] for c in $response.json()]
    Should Not Contain    ${names}    ${label}

A Freezer Category Drops Off The List When Its Last Item Goes
    [Documentation]    Categories are never deleted, so a label whose items have all gone would
    ...    otherwise be suggested forever.
    ${label}=    Unique Name    Frozen Category
    ${item}=    Create A Freezer Item    categories=${{ [$label] }}
    ${before}=    Authorized GET    /api/freezer/categories
    ${names}=    Evaluate    [c['name'] for c in $before.json()]
    Should Contain    ${names}    ${label}
    Authorized DELETE    /api/freezer/${item}[id]
    ${after}=    Authorized GET    /api/freezer/categories
    ${names}=    Evaluate    [c['name'] for c in $after.json()]
    Should Not Contain    ${names}    ${label}

The Freezer Category List Is Sorted By Name
    ${response}=    Authorized GET    /api/freezer/categories
    ${names}=    Evaluate    [c['name'] for c in $response.json()]
    ${sorted}=    Evaluate    sorted($names, key=str.casefold)
    Should Be Equal    ${names}    ${sorted}

Updating An Item Replaces Its Name Type And Categories
    ${categories}=    Create List    Beef
    ${item}=    Create A Freezer Item    categories=${categories}
    ${name}=    Unique Name    Renamed
    ${body}=    Create Dictionary
    ...    name=${name}
    ...    type=ingredient
    ...    placed_at=2026-02-01T09:00:00Z
    ...    categories=${{ ['Vegetables'] }}
    ${response}=    Authorized PUT    /api/freezer/${item}[id]    ${body}
    Should Be Equal    ${response.json()}[message]    Item updated
    ${listed}=    Authorized GET    /api/freezer
    ${stored}=    Find Item    ${listed.json()}    ${item}[id]
    Should Be Equal    ${stored}[name]    ${name}
    Should Be Equal    ${stored}[type]    ingredient
    Should Contain    ${stored}[categories]    Vegetables
    Should Not Contain    ${stored}[categories]    Beef

Updating An Item That Does Not Exist Is A 404
    ${body}=    Create Dictionary    name=Ghost    type=meal    placed_at=2026-02-01T09:00:00Z
    ${response}=    Authorized PUT    /api/freezer/${UNUSED_ID}    ${body}    expected_status=404
    Error Message Should Be    ${response}    Item not found

Updating Another User's Item Is Forbidden
    ${theirs}=    Create A Freezer Item    token=${OTHER}[token]
    ${body}=    Create Dictionary    name=Hijacked    type=meal    placed_at=2026-02-01T09:00:00Z
    ${response}=    Authorized PUT    /api/freezer/${theirs}[id]    ${body}    expected_status=403
    Error Message Should Be    ${response}    Unauthorized

Deleting An Item Removes It From The Freezer
    ${item}=    Create A Freezer Item
    ${response}=    Authorized DELETE    /api/freezer/${item}[id]
    Should Be Equal    ${response.json()}[message]    Item deleted
    ${listed}=    Authorized GET    /api/freezer
    ${ids}=    Evaluate    [i['id'] for i in $listed.json()]
    Should Not Contain    ${ids}    ${item}[id]

Deleting An Item That Does Not Exist Is A 404
    ${response}=    Authorized DELETE    /api/freezer/${UNUSED_ID}    expected_status=404
    Error Message Should Be    ${response}    Item not found

Deleting Another User's Item Is Forbidden
    ${theirs}=    Create A Freezer Item    token=${OTHER}[token]
    ${response}=    Authorized DELETE    /api/freezer/${theirs}[id]    expected_status=403
    Error Message Should Be    ${response}    Unauthorized


*** Keywords ***
Start Freezer Suite
    Open API Session
    Register The Suite User    freezer
    ${other}=    Register A User    freezer-other
    VAR    ${OTHER}    ${other}    scope=SUITE
    VAR    ${UNUSED_ID}    99999999    scope=SUITE

Adding An Item Of Type Should Succeed
    [Arguments]    ${type}
    ${item}=    Create A Freezer Item    type=${type}
    ${response}=    Authorized GET    /api/freezer
    ${stored}=    Find Item    ${response.json()}    ${item}[id]
    Should Be Equal    ${stored}[type]    ${type}

Creating An Item Should Fail
    [Arguments]    ${name}    ${type}
    ${body}=    Create Dictionary    name=${name}    type=${type}
    ${response}=    Authorized POST    /api/freezer    ${body}    expected_status=400
    Error Message Should Be    ${response}    Name and type are required

Find Item
    [Documentation]    Picks one item out of a freezer listing by id.
    [Arguments]    ${items}    ${id}
    FOR    ${item}    IN    @{items}
        IF    ${item}[id] == ${id}
            RETURN    ${item}
        END
    END
    Fail    No freezer item with id ${id} in the listing.
