function PaymentSection() {
  return (
    <section className="payment-section">

      <div className="payment-heading">

        <span>
          07 / PAYMENTS
        </span>

        <h2>
          SIMPLE.
          <br />
          SECURE.
          <br />
          <span>CONNECTED.</span>
        </h2>

      </div>

      <div className="payment-layout">

        <div className="membership-card">

          <div className="card-top">
            <span>
              FITPULSE OS
            </span>

            <span>
              PRO
            </span>
          </div>

          <div className="card-number">
            8842
            <span>••••</span>
            2917
          </div>

          <div className="card-bottom">
            <span>
              MEMBER ACCESS
            </span>

            <span>
              ACTIVE
            </span>
          </div>

        </div>

        <div className="payment-status">

          <span>
            TRANSACTION
          </span>

          <strong>
            PAYMENT
            <br />
            SUCCESSFUL
          </strong>

          <p>
            Your membership has been
            successfully renewed.
          </p>

          <button>
            VIEW RECEIPT
            <span>→</span>
          </button>

        </div>

      </div>

    </section>
  );
}

export default PaymentSection;