# Page snapshot

```yaml
- main [ref=e3]:
  - generic [ref=e5]:
    - img [ref=e7]
    - heading "Keystone Platform" [level=1] [ref=e9]
    - paragraph [ref=e10]: Sign in to continue
    - generic [ref=e11]:
      - generic [ref=e12]:
        - generic [ref=e13]:
          - text: Email Address
          - generic [ref=e14]: "*"
        - generic [ref=e15]:
          - textbox "Email Address" [active] [ref=e16]
          - group:
            - generic: Email Address *
      - generic [ref=e17]:
        - generic:
          - text: Password
          - generic: "*"
        - generic [ref=e18]:
          - textbox "Password" [ref=e19]
          - button "toggle password visibility" [ref=e21] [cursor=pointer]:
            - img [ref=e22] [cursor=pointer]
          - group:
            - generic: Password *
      - button "Sign In" [disabled]
    - generic [ref=e24]: © 2024 Keystone Platform. All rights reserved.
```