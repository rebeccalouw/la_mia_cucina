*** Settings ***
Documentation       /api/planner — the weekly meal plan, including the rule that planning a
...                 freezer meal consumes the item.

Resource            ../resources/api.resource

Suite Setup         Start Planner Suite
Suite Teardown      Delete Everything The Suite User Owns

Test Tags           api    planner


*** Test Cases ***
Every Planner Route Needs A Token
    [Template]    Request Without A Token Should Be Rejected
    GET       /api/planner
    POST      /api/planner
    PUT       /api/planner/1
    DELETE    /api/planner/1

A Recipe Can Be Planned For A Day And A Meal
    ${recipe}=    Create A Recipe
    ${date}=    Plan Date    1
    ${body}=    Create Dictionary    recipeId=${recipe}[id]    date=${date}    mealType=dinner
    ${response}=    Authorized POST    /api/planner    ${body}    expected_status=201
    Should Be Equal    ${response.json()}[message]    Meal plan created
    ${plan}=    Find Plan    ${response.json()}[id]
    Should Be Equal As Integers    ${plan}[recipe_id]    ${recipe}[id]
    Should Be Equal    ${plan}[date]    ${date}
    Should Be Equal    ${plan}[meal_type]    dinner
    Should Be Equal    ${plan}[recipe_title]    ${recipe}[title]

Every Meal Type The Column Allows Is Accepted
    [Template]    Planning A Meal Type Should Succeed
    breakfast
    lunch
    dinner
    snack

A Plain Note Can Be Planned Without A Recipe Or An Item
    ${date}=    Plan Date    2
    ${body}=    Create Dictionary    date=${date}    mealType=lunch    notes=Eating out
    ${response}=    Authorized POST    /api/planner    ${body}    expected_status=201
    ${plan}=    Find Plan    ${response.json()}[id]
    Should Be Equal    ${plan}[notes]    Eating out
    Should Be Equal    ${plan}[recipe_id]    ${None}
    Should Be Equal    ${plan}[freezer_item_name]    ${None}

Planning Needs A Recipe An Item Or A Note
    ${date}=    Plan Date    1
    ${body}=    Create Dictionary    date=${date}    mealType=dinner
    ${response}=    Authorized POST    /api/planner    ${body}    expected_status=400
    Error Message Should Be    ${response}
    ...    Recipe, Freezer Item, or Note, plus date and meal type are required

Planning Needs A Date And A Meal Type
    [Template]    Planning Should Fail
    400    Date and meal type are required                 ${EMPTY}      dinner
    400    Date and meal type are required                 ${EMPTY}      ${EMPTY}
    400    Date must be in YYYY-MM-DD format               01/02/2026    dinner
    400    Date must be in YYYY-MM-DD format               2026-2-1      dinner
    400    Date must be in YYYY-MM-DD format               tomorrow      dinner

An Unknown Meal Type Is Rejected
    ${date}=    Plan Date    1
    ${body}=    Create Dictionary    date=${date}    mealType=elevenses    notes=Cake
    ${response}=    Authorized POST    /api/planner    ${body}    expected_status=400
    Error Message Should Be    ${response}
    ...    Meal type must be one of: breakfast, lunch, dinner, snack

Planning A Recipe That Does Not Exist Is A 404
    ${date}=    Plan Date    1
    ${body}=    Create Dictionary    recipeId=${UNUSED_ID}    date=${date}    mealType=dinner
    ${response}=    Authorized POST    /api/planner    ${body}    expected_status=404
    Error Message Should Be    ${response}    Recipe not found in your pantry

Planning Another User's Recipe Is A 404
    [Documentation]    The lookup is scoped to the caller, so someone else's recipe is simply
    ...    not there rather than forbidden.
    ${theirs}=    Create A Recipe    token=${OTHER}[token]
    ${date}=    Plan Date    1
    ${body}=    Create Dictionary    recipeId=${theirs}[id]    date=${date}    mealType=dinner
    ${response}=    Authorized POST    /api/planner    ${body}    expected_status=404
    Error Message Should Be    ${response}    Recipe not found in your pantry

Planning A Freezer Meal Records Its Name And Takes It Out Of The Freezer
    [Documentation]    The item is consumed by the plan: its name is copied onto the plan and
    ...    the freezer row is removed, both inside one transaction.
    ${item}=    Create A Freezer Item
    ${date}=    Plan Date    3
    ${body}=    Create Dictionary
    ...    freezerItemId=${item}[id]    date=${date}    mealType=dinner
    ${response}=    Authorized POST    /api/planner    ${body}    expected_status=201
    Should Be Equal    ${response.json()}[message]    Meal plan created and item removed from freezer
    ${plan}=    Find Plan    ${response.json()}[id]
    Should Be Equal    ${plan}[freezer_item_name]    ${item}[name]
    Freezer Should Not Contain    ${item}[id]

Planning A Freezer Item That Does Not Exist Is A 404
    ${date}=    Plan Date    1
    ${body}=    Create Dictionary
    ...    freezerItemId=${UNUSED_ID}    date=${date}    mealType=dinner
    ${response}=    Authorized POST    /api/planner    ${body}    expected_status=404
    Error Message Should Be    ${response}    Freezer item not found

Planning Another User's Freezer Item Is A 404 And Leaves It Alone
    ${theirs}=    Create A Freezer Item    token=${OTHER}[token]
    ${date}=    Plan Date    1
    ${body}=    Create Dictionary
    ...    freezerItemId=${theirs}[id]    date=${date}    mealType=dinner
    ${response}=    Authorized POST    /api/planner    ${body}    expected_status=404
    Error Message Should Be    ${response}    Freezer item not found
    ${listed}=    Authorized GET    /api/freezer    token=${OTHER}[token]
    ${ids}=    Evaluate    [i['id'] for i in $listed.json()]
    Should Contain    ${ids}    ${theirs}[id]

A Rejected Plan Never Consumes The Freezer Item
    [Documentation]    Regression cover: the body is validated before the database is touched,
    ...    so a bad date can no longer empty the freezer.
    ${item}=    Create A Freezer Item
    ${body}=    Create Dictionary
    ...    freezerItemId=${item}[id]    date=not-a-date    mealType=dinner
    Authorized POST    /api/planner    ${body}    expected_status=400
    Freezer Should Contain    ${item}[id]

Notes Are Trimmed And Blank Notes Are Stored Empty
    ${recipe}=    Create A Recipe
    ${date}=    Plan Date    1
    ${body}=    Create Dictionary
    ...    recipeId=${recipe}[id]    date=${date}    mealType=lunch    notes=${SPACE}Extra chilli${SPACE}
    ${response}=    Authorized POST    /api/planner    ${body}    expected_status=201
    ${plan}=    Find Plan    ${response.json()}[id]
    Should Be Equal    ${plan}[notes]    Extra chilli

The Plan List Holds Only The Owner's Plans
    ${mine}=    Plan A Recipe
    ${theirs}=    Plan A Recipe    token=${OTHER}[token]
    ${response}=    Authorized GET    /api/planner
    ${ids}=    Evaluate    [p['id'] for p in $response.json()]
    Should Contain    ${ids}    ${mine}
    Should Not Contain    ${ids}    ${theirs}

Plans Can Be Fetched For A Date Range
    ${inside}=    Plan A Recipe    offset=${20}
    ${outside}=    Plan A Recipe    offset=${60}
    ${start}=    Plan Date    19
    ${end}=    Plan Date    21
    ${params}=    Create Dictionary    start=${start}    end=${end}
    ${response}=    Authorized GET    /api/planner    params=${params}
    ${ids}=    Evaluate    [p['id'] for p in $response.json()]
    Should Contain    ${ids}    ${inside}
    Should Not Contain    ${ids}    ${outside}

The Range Boundaries Are Included
    ${plan}=    Plan A Recipe    offset=${30}
    ${date}=    Plan Date    30
    ${params}=    Create Dictionary    start=${date}    end=${date}
    ${response}=    Authorized GET    /api/planner    params=${params}
    ${ids}=    Evaluate    [p['id'] for p in $response.json()]
    Should Contain    ${ids}    ${plan}

Plans Are Ordered By Date
    ${response}=    Authorized GET    /api/planner
    ${dates}=    Evaluate    [p['date'] for p in $response.json()]
    ${sorted}=    Evaluate    sorted($dates)
    Should Be Equal    ${dates}    ${sorted}

Dates Come Back As Plain YYYY-MM-DD Strings
    [Documentation]    The date is formatted in SQL rather than serialised as a timestamp, so a
    ...    plan cannot drift a day when the client's timezone is behind UTC.
    ${date}=    Plan Date    5
    ${id}=    Plan A Recipe    offset=${5}
    ${plan}=    Find Plan    ${id}
    Should Be Equal    ${plan}[date]    ${date}
    Should Match Regexp    ${plan}[date]    ^\\d{4}-\\d{2}-\\d{2}$

Editing A Plan Moves It To Another Day And Meal
    ${recipe}=    Create A Recipe
    ${id}=    Plan A Recipe    recipe=${recipe}    offset=${1}
    ${date}=    Plan Date    4
    ${body}=    Create Dictionary
    ...    recipeId=${recipe}[id]    date=${date}    mealType=breakfast    notes=Moved
    ${response}=    Authorized PUT    /api/planner/${id}    ${body}
    Should Be Equal    ${response.json()}[message]    Meal plan updated successfully
    ${plan}=    Find Plan    ${id}
    Should Be Equal    ${plan}[date]    ${date}
    Should Be Equal    ${plan}[meal_type]    breakfast
    Should Be Equal    ${plan}[notes]    Moved

Editing A Freezer Meal Keeps Its Name Without Eating A Second Item
    [Documentation]    Regression cover for the bug where every edit of a plan consumed another
    ...    freezer item. An already-consumed meal is carried through the edit by name, which
    ...    must delete nothing.
    ${planned}=    Create A Freezer Item
    ${spare}=    Create A Freezer Item
    ${first_day}=    Plan Date    6
    ${second_day}=    Plan Date    7
    ${body}=    Create Dictionary
    ...    freezerItemId=${planned}[id]    date=${first_day}    mealType=dinner
    ${created}=    Authorized POST    /api/planner    ${body}    expected_status=201
    ${edit}=    Create Dictionary
    ...    freezerItemName=${planned}[name]    date=${second_day}    mealType=lunch
    Authorized PUT    /api/planner/${created.json()}[id]    ${edit}
    ${plan}=    Find Plan    ${created.json()}[id]
    Should Be Equal    ${plan}[freezer_item_name]    ${planned}[name]
    Should Be Equal    ${plan}[meal_type]    lunch
    Freezer Should Contain    ${spare}[id]

Editing A Plan Onto A Freshly Picked Freezer Item Consumes That One
    ${first}=    Create A Freezer Item
    ${second}=    Create A Freezer Item
    ${day}=    Plan Date    8
    ${body}=    Create Dictionary
    ...    freezerItemId=${first}[id]    date=${day}    mealType=dinner
    ${created}=    Authorized POST    /api/planner    ${body}    expected_status=201
    ${edit}=    Create Dictionary
    ...    freezerItemId=${second}[id]    date=${day}    mealType=dinner
    Authorized PUT    /api/planner/${created.json()}[id]    ${edit}
    ${plan}=    Find Plan    ${created.json()}[id]
    Should Be Equal    ${plan}[freezer_item_name]    ${second}[name]
    Freezer Should Not Contain    ${second}[id]

Editing Validates The Body Before Touching Anything
    ${item}=    Create A Freezer Item
    ${id}=    Plan A Recipe
    ${day}=    Plan Date    9
    ${edit}=    Create Dictionary
    ...    freezerItemId=${item}[id]    date=${day}    mealType=brunch
    ${response}=    Authorized PUT    /api/planner/${id}    ${edit}    expected_status=400
    Error Message Should Contain    ${response}    Meal type must be one of
    Freezer Should Contain    ${item}[id]

Editing A Plan That Does Not Exist Is A 404
    ${day}=    Plan Date    1
    ${body}=    Create Dictionary    date=${day}    mealType=dinner    notes=Ghost
    ${response}=    Authorized PUT    /api/planner/${UNUSED_ID}    ${body}    expected_status=404
    Error Message Should Be    ${response}    Meal plan not found or unauthorized

Editing Another User's Plan Is A 404
    ${theirs}=    Plan A Recipe    token=${OTHER}[token]
    ${day}=    Plan Date    1
    ${body}=    Create Dictionary    date=${day}    mealType=dinner    notes=Hijacked
    ${response}=    Authorized PUT    /api/planner/${theirs}    ${body}    expected_status=404
    Error Message Should Be    ${response}    Meal plan not found or unauthorized

Deleting A Plan Removes It
    ${id}=    Plan A Recipe
    ${response}=    Authorized DELETE    /api/planner/${id}
    Should Be Equal    ${response.json()}[message]    Meal plan deleted
    ${listed}=    Authorized GET    /api/planner
    ${ids}=    Evaluate    [p['id'] for p in $listed.json()]
    Should Not Contain    ${ids}    ${id}

Deleting A Plan Does Not Put The Freezer Item Back
    [Documentation]    Current behaviour: the item was consumed when the meal was planned and
    ...    the row is gone, so removing the plan cannot restore it.
    ${item}=    Create A Freezer Item
    ${day}=    Plan Date    10
    ${body}=    Create Dictionary
    ...    freezerItemId=${item}[id]    date=${day}    mealType=dinner
    ${created}=    Authorized POST    /api/planner    ${body}    expected_status=201
    Authorized DELETE    /api/planner/${created.json()}[id]
    Freezer Should Not Contain    ${item}[id]

Deleting A Plan That Does Not Exist Is A 404
    ${response}=    Authorized DELETE    /api/planner/${UNUSED_ID}    expected_status=404
    Error Message Should Be    ${response}    Meal plan not found or unauthorized

Deleting Another User's Plan Is A 404
    ${theirs}=    Plan A Recipe    token=${OTHER}[token]
    ${response}=    Authorized DELETE    /api/planner/${theirs}    expected_status=404
    Error Message Should Be    ${response}    Meal plan not found or unauthorized

Deleting The Recipe Behind A Plan Removes The Plan Too
    [Documentation]    meal_plans.recipe_id cascades, so a deleted recipe takes its plans with
    ...    it rather than leaving rows pointing at nothing.
    ${recipe}=    Create A Recipe
    ${id}=    Plan A Recipe    recipe=${recipe}
    Authorized DELETE    /api/recipes/${recipe}[id]
    ${listed}=    Authorized GET    /api/planner
    ${ids}=    Evaluate    [p['id'] for p in $listed.json()]
    Should Not Contain    ${ids}    ${id}


*** Keywords ***
Start Planner Suite
    Open API Session
    Register The Suite User    planner
    ${other}=    Register A User    planner-other
    VAR    ${OTHER}    ${other}    scope=SUITE
    VAR    ${UNUSED_ID}    99999999    scope=SUITE
    ${shared}=    Create A Recipe
    VAR    ${SHARED_RECIPE}    ${shared}    scope=SUITE

Plan A Recipe
    [Documentation]    Plans a recipe and returns the new plan's id.
    [Arguments]    ${recipe}=${None}    ${offset}=${1}    ${meal_type}=dinner    ${token}=${TOKEN}
    IF    $recipe is None
        ${recipe}=    Create A Recipe    token=${token}
    END
    ${date}=    Plan Date    ${offset}
    ${body}=    Create Dictionary
    ...    recipeId=${recipe}[id]
    ...    date=${date}
    ...    mealType=${meal_type}
    ${response}=    Authorized POST    /api/planner    ${body}    expected_status=201
    ...    token=${token}
    RETURN    ${response.json()}[id]

Planning A Meal Type Should Succeed
    [Arguments]    ${meal_type}
    ${id}=    Plan A Recipe    meal_type=${meal_type}
    ${plan}=    Find Plan    ${id}
    Should Be Equal    ${plan}[meal_type]    ${meal_type}

Planning Should Fail
    [Arguments]    ${status}    ${message}    ${date}    ${meal_type}
    ${body}=    Create Dictionary
    ...    recipeId=${SHARED_RECIPE}[id]    date=${date}    mealType=${meal_type}
    ${response}=    Authorized POST    /api/planner    ${body}    expected_status=${status}
    Error Message Should Be    ${response}    ${message}

Find Plan
    [Documentation]    Reads one plan back out of the listing, which is the only way the API
    ...    exposes a single plan.
    [Arguments]    ${id}
    ${response}=    Authorized GET    /api/planner
    FOR    ${plan}    IN    @{response.json()}
        IF    ${plan}[id] == ${id}
            RETURN    ${plan}
        END
    END
    Fail    No meal plan with id ${id} in the listing.

Freezer Should Contain
    [Arguments]    ${id}
    ${response}=    Authorized GET    /api/freezer
    ${ids}=    Evaluate    [i['id'] for i in $response.json()]
    Should Contain    ${ids}    ${id}    msg=Freezer item ${id} should still be in the freezer.

Freezer Should Not Contain
    [Arguments]    ${id}
    ${response}=    Authorized GET    /api/freezer
    ${ids}=    Evaluate    [i['id'] for i in $response.json()]
    Should Not Contain    ${ids}    ${id}    msg=Freezer item ${id} should have been consumed.
